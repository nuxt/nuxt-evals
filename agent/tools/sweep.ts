import { getVercelOidcToken } from '@vercel/oidc';
import { defineWorkflowTool, type WorkflowStepToolContext } from 'eve/tools';
import { sleep } from 'eve/workflow';
import { z } from 'zod';
import { BASE_BRANCH, BOT_EMAIL, BOT_NAME_IN_COMMITS, mayStartSweeps, REPOSITORY } from '../lib/github';
import type { ProgressLabel } from '../lib/progress';
import { OPEN_POLICY, run, SWEEP_STATE, syncBase } from '../lib/sandbox';

/** Infra failures are deleted, not counted, so the same run is the retry. */
const MAX_PASSES = 4;
/** How often a running pass is checked. Each check also keeps the sandbox from timing out. */
const CHECK_EVERY = '3m';
/** A pass still running after this many checks is stopped. Real passes take well under an hour. */
const MAX_CHECKS_PER_PASS = 60;
const STATE = SWEEP_STATE;
const TSX = 'node_modules/.bin/tsx';

const experimentName = z.string().regex(/^[\w.-]+$/);

interface Prepared {
  base: string;
  head: string | null;
  headRef: string | null;
  pullRequest: number | null;
  startedAt: number;
  /** Every experiment the sweep covers, pending or not: what the commit message names. */
  names: string[];
  /** The ones with evals to run. */
  experiments: Array<{ name: string; evals: number }>;
  skipped: string[];
}

export default defineWorkflowTool({
  description: 'Run the paid evals for a registration pull request, or for every tier-1 model with evals left, then export and commit the results locally. Only call it for a box the maintainer checked on the Evals Dashboard. It takes an hour or more. Afterwards, push the commit it reports and reply with its board.',
  inputSchema: z.object({
    pullRequest: z.number().int().positive().optional().describe('The registration pull request to sweep. Omit to sweep what tier 1 is missing.'),
    experiments: z.array(experimentName).max(20).optional().describe('Limit a tier-1 sweep to these experiments.'),
    smoke: z.boolean().default(false).describe('One eval per model, to check access. Nothing is committed.'),
  }),
  async execute(input, ctx) {
    'use workflow';
    const prepared = await prepare(ctx, input);
    if (input.smoke && prepared.experiments.length === 0) {
      return { ran: false, reason: 'No experiment to smoke test.', skipped: prepared.skipped };
    }
    // With nothing pending, a sweep still goes on to finish: a previous call
    // can have paid for results and failed before committing them.

    const passes: Array<{ name: string; pass: number; evals: number; checks: number; tail: string }> = [];
    const incomplete: Record<string, string[]> = {};
    for (const { name } of prepared.experiments) {
      for (let pass = 1; pass <= (input.smoke ? 1 : MAX_PASSES); pass++) {
        const started = await startPass(ctx, name, pass, input.smoke);
        if (!started.evals) break;
        let checks = 0;
        let status = { running: true, tail: '' };
        while (status.running && checks < MAX_CHECKS_PER_PASS) {
          await sleep(CHECK_EVERY);
          checks++;
          status = await checkPass(ctx, name, pass, checks >= MAX_CHECKS_PER_PASS, {
            what: input.smoke ? 'Smoke test' : prepared.pullRequest ? `Sweep of #${prepared.pullRequest}` : 'Sweep of tier 1',
            model: prepared.experiments.findIndex((experiment) => experiment.name === name) + 1,
            models: prepared.experiments.length,
            passes: input.smoke ? 1 : MAX_PASSES,
          });
        }
        passes.push({ name, pass, evals: started.evals, checks, tail: status.tail });
      }
      if (!input.smoke) {
        const left = await prune(ctx, name, prepared.startedAt);
        if (left.length > 0) incomplete[name] = left;
      }
    }

    if (input.smoke) return { ran: true, smoke: true, passes, skipped: prepared.skipped };
    const finished = await finish(ctx, prepared);
    return { ran: true, ...finished, passes: passes.map(({ tail, ...pass }) => pass), incomplete, skipped: prepared.skipped };
  },
});

async function prepare(ctx: WorkflowStepToolContext, input: { pullRequest?: number; experiments?: string[]; smoke: boolean }): Promise<Prepared> {
  'use step';
  // The model only calls this after being asked, but the check lives here.
  if (!mayStartSweeps(ctx.session.auth.current)) {
    throw new Error('Only the maintainer can start a sweep. Say so in the thread instead.');
  }
  const sandbox = await ctx.getSandbox();

  // main's scripts and dependencies, never the pull request's: agent-eval runs
  // with the gateway token. From a pull request only the experiment files it
  // adds are taken, and `sweep plan` refuses any that is not a plain config.
  // Loaded inside the step, like every Node.js-backed module here.
  const { environment } = await import('../sandbox/sandbox');
  await (await ctx.getSandbox(environment)).setNetworkPolicy(OPEN_POLICY);
  const base = await syncBase(sandbox, BASE_BRANCH);

  let head: string | null = null;
  let headRef: string | null = null;
  let names = input.experiments ?? [];
  if (input.pullRequest) {
    const response = await fetch(`https://api.github.com/repos/${REPOSITORY}/pulls/${input.pullRequest}`, { headers: { accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error(`Could not read #${input.pullRequest}: ${response.status}`);
    const pull = await response.json() as { state: string; head: { sha: string; ref: string; repo: { full_name: string } | null } };
    if (pull.state !== 'open' || pull.head.repo?.full_name !== REPOSITORY) throw new Error(`#${input.pullRequest} is closed or comes from a fork.`);
    head = pull.head.sha;
    headRef = pull.head.ref;
    await run(sandbox, `git fetch -q origin refs/pull/${input.pullRequest}/head`);
    // Exit 1 means not an ancestor. Anything else means git could not tell,
    // like a missing commit, which must not be reported as a stale branch.
    const behind = await sandbox.run({ command: `git merge-base --is-ancestor ${base} ${head}` });
    if (behind.exitCode === 1) throw new Error(`#${input.pullRequest} is behind main, so its export would run on another eval set. Rebase its branch onto main as the dashboard skill says, then call sweep again.`);
    if (behind.exitCode !== 0) throw new Error(`Could not compare #${input.pullRequest} with main: ${(behind.stderr || behind.stdout).trim()}`);
    names = (await run(sandbox, `git diff --name-only --diff-filter=A ${base}...${head} -- experiments/`))
      .split('\n').filter(Boolean).map((path) => path.replace(/^experiments\/(.*)\.ts$/, '$1'));
    if (names.length === 0) throw new Error(`#${input.pullRequest} adds no experiment.`);
    // The export runs on the pull request's tree, so its code runs here too.
    // main's script checks that the pull request only adds data: experiment
    // files, table rows and the tier list.
    await run(sandbox, `${TSX} scripts/sweep.ts verify-pr ${base} ${head}`);
    for (const name of experimentName.array().parse(names)) {
      await run(sandbox, `git show ${head}:experiments/${name}.ts > experiments/${name}.ts`);
    }
  }

  const flags = [input.pullRequest ? '--registration' : '', input.smoke ? '--smoke' : ''].filter(Boolean).join(' ');
  const plan = JSON.parse(await run(sandbox, `${TSX} scripts/sweep.ts plan ${names.join(' ')} ${flags} --json`)) as { experiments: Prepared['experiments']; skipped: string[] };
  await run(sandbox, `mkdir -p ${STATE}`);
  return {
    base, head, headRef,
    pullRequest: input.pullRequest ?? null,
    startedAt: Date.now(),
    names: names.length > 0 ? names : plan.experiments.map(({ name }) => name),
    experiments: plan.experiments,
    skipped: plan.skipped,
  };
}

async function startPass(ctx: WorkflowStepToolContext, name: string, pass: number, smoke: boolean): Promise<{ evals: number }> {
  'use step';
  const sandbox = await ctx.getSandbox();
  const left = smoke ? ['smoke'] : JSON.parse(await run(sandbox, `${TSX} scripts/sweep.ts pending ${name}`)) as string[];
  if (left.length === 0) return { evals: 0 };
  // A step can run again after it already started the process. Never start a
  // second agent-eval next to a live one: it would bill the same evals twice.
  const live = await sandbox.run({ command: `[ -f ${STATE}/${name}-${pass}.log ] && kill -0 $(cat ${STATE}/pid) 2>/dev/null` });
  if (live.exitCode === 0) return { evals: left.length };
  // Minted in this step and handed to the process only, never returned: step
  // results are stored in the workflow's event log. A fresh one per pass, so
  // a long sweep never runs on a token close to expiry. agent-eval creates the
  // eval sandboxes with it.
  const token = await getVercelOidcToken();
  // The project runs on the Nuxt team, but model calls go through a
  // vercel-labs gateway key, for its provider allowlist and billing, so
  // results stay comparable with the board. agent-eval prefers the key over
  // the token for the gateway. It treats an empty key as set, so a missing one
  // is left out rather than passed empty.
  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim();
  await run(
    sandbox,
    `setsid nohup node_modules/.bin/agent-eval run ${smoke ? '--smoke ' : ''}${name} > ${STATE}/${name}-${pass}.log 2>&1 < /dev/null & echo $! > ${STATE}/pid`,
    { VERCEL_OIDC_TOKEN: token, ...(gatewayKey ? { AI_GATEWAY_API_KEY: gatewayKey } : {}) },
  );
  return { evals: left.length };
}

async function checkPass(ctx: WorkflowStepToolContext, name: string, pass: number, stop: boolean, label: ProgressLabel): Promise<{ running: boolean; tail: string }> {
  'use step';
  const sandbox = await ctx.getSandbox();
  if (stop) await sandbox.run({ command: `kill $(cat ${STATE}/pid) 2>/dev/null; sleep 5` });
  const state = await sandbox.run({ command: `kill -0 $(cat ${STATE}/pid) 2>/dev/null && echo running || echo done` });
  // Strip the terminal codes agent-eval's dashboard prints.
  // Result lines when there are any, otherwise the last lines, so a run that
  // stopped early says why.
  const log = `tail -c 6000 ${STATE}/${name}-${pass}.log | sed 's/\\x1b\\[[0-9;]*[A-Za-z]//g' | tr '\\r' '\\n' | grep -v '^\\s*$'`;
  const tail = await sandbox.run({ command: `{ ${log} | grep -E '✓|✗|passed|failed|Error|error|skipping|not set' || ${log}; } | tail -15` });
  // The whole log, for the progress counts: the tail above drops early lines.
  const full = await sandbox.run({ command: `sed 's/\\x1b\\[[0-9;]*[A-Za-z]//g' ${STATE}/${name}-${pass}.log | tr '\\r' '\\n' | grep -E 'Starting [0-9]+ eval attempts|^[✓✗] '` });
  // Loaded here, inside the step: the GitHub client pulls in Node.js APIs,
  // which the workflow bundle refuses at the top of this module.
  const { reportProgress } = await import('../lib/progress');
  await reportProgress(label, name, pass, full.stdout);
  return { running: state.stdout.trim() === 'running', tail: tail.stdout.trim() };
}

async function prune(ctx: WorkflowStepToolContext, name: string, since: number): Promise<string[]> {
  'use step';
  const sandbox = await ctx.getSandbox();
  const out = (await run(sandbox, `${TSX} scripts/sweep.ts prune ${name} --since ${since}`)).trim();
  return out ? JSON.parse(out) as string[] : [];
}

async function finish(ctx: WorkflowStepToolContext, prepared: Prepared) {
  'use step';
  const sandbox = await ctx.getSandbox();
  const start = prepared.head ?? prepared.base;
  const names = prepared.names.join(', ');
  const message = prepared.pullRequest ? `chore(results): add ${names}` : 'chore(results): rerun tier 1';
  // Only agent/* branches can be pushed. A pull request from anyone else gets
  // its results on a new branch instead.
  const pushTo = (committed: string) => prepared.headRef?.startsWith('agent/')
    ? prepared.headRef
    : `agent/results-${new Date(prepared.startedAt).toISOString().slice(0, 10)}-${committed}`;
  const report = async (extra: { board: string; promoted: string }) => {
    const committed = (await run(sandbox, 'git rev-parse --short HEAD')).trim();
    const stat = (await run(sandbox, 'git show --stat --format= HEAD | tail -1')).trim();
    const branch = pushTo(committed);
    return { committed, message, stat, ...extra, pushTo: branch, newPullRequest: branch !== prepared.headRef };
  };

  // A step can run again after it already committed. Report that commit
  // instead of checking out the start again, which would leave it behind.
  const previous = await sandbox.run({ command: `[ "$(git rev-parse HEAD^)" = "${start}" ] && [ "$(git log -1 --format=%s)" = '${message}' ]` });
  if (previous.exitCode === 0) return report({ board: '', promoted: '' });

  // Nothing new in results/, from this call or an earlier one that failed
  // before committing: there is nothing to export.
  const fresh = (await run(sandbox, 'git status --porcelain -- results')).trim();
  if (!fresh) return { committed: null, board: '', promoted: '', pushTo: null, reason: 'No new results to commit. Evals still missing are listed in `incomplete`.' };

  // The export needs the pull request's display name, price and tier, so it
  // runs on its tree, after agent-eval and its token are gone. Results are
  // ignored files and stay where they are.
  if (prepared.head) {
    await run(sandbox, `rm -f ${prepared.names.map((name) => `experiments/${name}.ts`).join(' ')} && git checkout -q -f --detach ${prepared.head} && pnpm install --frozen-lockfile`);
  }
  const promoted = (await run(sandbox, `${TSX} scripts/sweep.ts promote`)).trim();
  const exported = await run(sandbox, 'pnpm run export-results');
  await run(sandbox, 'pnpm run test:cost');
  const board = exported.slice(Math.max(0, exported.indexOf('Model  '))).trim();

  await run(sandbox, 'git add results agent-results.json scripts/tier-one.ts');
  const staged = await sandbox.run({ command: 'git diff --cached --quiet' });
  if (staged.exitCode === 0) return { committed: null, board, promoted, pushTo: null };

  await run(sandbox, `git -c user.name='${BOT_NAME_IN_COMMITS}' -c user.email='${BOT_EMAIL}' -c core.hooksPath=/dev/null commit -q -m '${message}'`);
  return report({ board, promoted });
}
