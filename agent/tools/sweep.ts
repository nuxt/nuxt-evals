import { getVercelOidcToken } from '@vercel/oidc';
import { defineWorkflowTool, type WorkflowStepToolContext } from 'eve/tools';
import { sleep } from 'eve/workflow';
import { z } from 'zod';
import { mayStartSweeps, REPOSITORY } from '../lib/github';
import { run } from '../lib/sandbox';

/** Infra failures are deleted, not counted, so the same run is the retry. */
const MAX_PASSES = 4;
/** How often a running pass is checked. Each check also keeps the sandbox from timing out. */
const CHECK_EVERY = '3m';
/** A pass still running after this many checks is stopped. Real passes take well under an hour. */
const MAX_CHECKS_PER_PASS = 60;
/** Untracked and ignored, next to the checkout: logs and the running pass's pid. */
const STATE = '.eve-sweep';
const TSX = 'node_modules/.bin/tsx';

const experimentName = z.string().regex(/^[\w.-]+$/);

interface Prepared {
  base: string;
  head: string | null;
  headRef: string | null;
  pullRequest: number | null;
  startedAt: number;
  experiments: Array<{ name: string; evals: number }>;
  skipped: string[];
}

export default defineWorkflowTool({
  description: 'Run the paid evals for a registration pull request, or for every tier-1 model with evals left, then export and commit the results locally. Only call it when the maintainer asked for a sweep in this thread. It takes an hour or more. Afterwards, push the commit it reports and reply with its board.',
  inputSchema: z.object({
    pullRequest: z.number().int().positive().optional().describe('The registration pull request to sweep. Omit to sweep what tier 1 is missing.'),
    experiments: z.array(experimentName).max(20).optional().describe('Limit a tier-1 sweep to these experiments.'),
    smoke: z.boolean().default(false).describe('One eval per model, to check access. Nothing is committed.'),
  }),
  async execute(input, ctx) {
    'use workflow';
    const prepared = await prepare(ctx, input);
    if (prepared.experiments.length === 0) {
      return { ran: false, reason: 'Every experiment already has a current result for every eval.', skipped: prepared.skipped };
    }

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
          status = await checkPass(ctx, name, pass, checks >= MAX_CHECKS_PER_PASS);
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
  await run(sandbox, `git fetch -q origin main && git checkout -q -f --detach origin/main && git clean -fdq -e ${STATE} && pnpm install --frozen-lockfile`);
  const base = (await run(sandbox, 'git rev-parse HEAD')).trim();

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
    const behind = await sandbox.run({ command: `git merge-base --is-ancestor ${base} ${head}` });
    if (behind.exitCode !== 0) throw new Error(`#${input.pullRequest} is behind main. Its branch has to be updated first, or its export would run on another eval set.`);
    names = (await run(sandbox, `git diff --name-only --diff-filter=A ${base}...${head} -- experiments/`))
      .split('\n').filter(Boolean).map((path) => path.replace(/^experiments\/(.*)\.ts$/, '$1'));
    if (names.length === 0) throw new Error(`#${input.pullRequest} adds no experiment.`);
    for (const name of experimentName.array().parse(names)) {
      await run(sandbox, `git show ${head}:experiments/${name}.ts > experiments/${name}.ts`);
    }
  }

  const flags = [input.pullRequest ? '--registration' : '', input.smoke ? '--smoke' : ''].filter(Boolean).join(' ');
  const plan = JSON.parse(await run(sandbox, `${TSX} scripts/sweep.ts plan ${names.join(' ')} ${flags} --json`)) as { experiments: Prepared['experiments']; skipped: string[] };
  await run(sandbox, `mkdir -p ${STATE}`);
  return { base, head, headRef, pullRequest: input.pullRequest ?? null, startedAt: Date.now(), experiments: plan.experiments, skipped: plan.skipped };
}

async function startPass(ctx: WorkflowStepToolContext, name: string, pass: number, smoke: boolean): Promise<{ evals: number }> {
  'use step';
  const sandbox = await ctx.getSandbox();
  const left = smoke ? ['smoke'] : JSON.parse(await run(sandbox, `${TSX} scripts/sweep.ts pending ${name}`)) as string[];
  if (left.length === 0) return { evals: 0 };
  // Minted in this step and handed to the process only, never returned: step
  // results are stored in the workflow's event log. A fresh one per pass, so
  // a long sweep never runs on a token close to expiry.
  const token = await getVercelOidcToken();
  await run(
    sandbox,
    `setsid nohup node_modules/.bin/agent-eval run ${smoke ? '--smoke ' : ''}${name} > ${STATE}/${name}-${pass}.log 2>&1 < /dev/null & echo $! > ${STATE}/pid`,
    { VERCEL_OIDC_TOKEN: token, AI_GATEWAY_API_KEY: '' },
  );
  return { evals: left.length };
}

async function checkPass(ctx: WorkflowStepToolContext, name: string, pass: number, stop: boolean): Promise<{ running: boolean; tail: string }> {
  'use step';
  const sandbox = await ctx.getSandbox();
  if (stop) await sandbox.run({ command: `kill $(cat ${STATE}/pid) 2>/dev/null; sleep 5` });
  const state = await sandbox.run({ command: `kill -0 $(cat ${STATE}/pid) 2>/dev/null && echo running || echo done` });
  // Strip the terminal codes agent-eval's dashboard prints.
  const tail = await sandbox.run({ command: `tail -c 4000 ${STATE}/${name}-${pass}.log | sed 's/\\x1b\\[[0-9;]*[A-Za-z]//g' | grep -E '✓|✗|passed|failed|Error|error' | tail -15` });
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
  // The export needs the pull request's display name, price and tier, so it
  // runs on its tree, after agent-eval and its token are gone. Results are
  // ignored files and stay where they are.
  if (prepared.head) {
    await run(sandbox, `rm -f ${prepared.experiments.map(({ name }) => `experiments/${name}.ts`).join(' ')} && git checkout -q -f --detach ${prepared.head} && pnpm install --frozen-lockfile`);
  }
  const promoted = (await run(sandbox, `${TSX} scripts/sweep.ts promote`)).trim();
  const exported = await run(sandbox, 'pnpm run export-results');
  await run(sandbox, 'pnpm run test:cost');
  const board = exported.slice(Math.max(0, exported.indexOf('Model  '))).trim();

  await run(sandbox, 'git add results agent-results.json scripts/tier-one.ts');
  const staged = await sandbox.run({ command: 'git diff --cached --quiet' });
  if (staged.exitCode === 0) return { committed: null, board, promoted, pushTo: null };

  const names = prepared.experiments.map(({ name }) => name).join(', ');
  const message = prepared.pullRequest ? `chore(results): add ${names}` : 'chore(results): rerun tier 1';
  await run(sandbox, `git -c user.name='nuxt-evals[bot]' -c user.email='nuxt-evals[bot]@users.noreply.github.com' commit -q -m '${message}'`);
  const committed = (await run(sandbox, 'git rev-parse --short HEAD')).trim();
  const stat = (await run(sandbox, 'git show --stat --format= HEAD | tail -1')).trim();
  // Only agent/* branches can be pushed. A pull request from anyone else gets
  // its results on a new branch instead.
  const pushTo = prepared.headRef?.startsWith('agent/') ? prepared.headRef : `agent/results-${new Date().toISOString().slice(0, 10)}`;
  return { committed, message, stat, board, promoted, pushTo, newPullRequest: pushTo !== prepared.headRef };
}
