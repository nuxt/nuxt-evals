/**
 * The steps of .github/workflows/evals.yml that need more than a shell line.
 * Each one also runs locally, `plan` and `promote` for free.
 *
 *   tsx scripts/ci.ts plan [experiments...]   what a sweep would run
 *   tsx scripts/ci.ts sweep <experiments...>  run it, with infra retry passes (paid)
 *   tsx scripts/ci.ts promote                 demote predecessors whose successor is complete
 *
 * `plan` with no name covers every tier-1 experiment. It refuses tier 2, since
 * those are never rerun, and anything that is not a gateway harness, since CI
 * only holds gateway credentials.
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  computeFingerprint,
  computeReuseCompatibilityFingerprint,
  discoverFixtures,
  loadConfig,
  scanReusableResults,
} from '@vercel/agent-eval';
import { TIER_ONE_EXPERIMENTS } from './tier-one.ts';

/** Infra failures are deleted, not counted, so the same command is the retry. */
const MAX_PASSES = 4;

const [command, ...args] = process.argv.slice(2);
const names = args.filter((arg) => !arg.startsWith('--'));
const smoke = args.includes('--smoke');
// The experiments of a registration pull request are not tier 1 on main yet.
const registration = args.includes('--registration');

const agentEval = (argv: string[], capture = false) =>
  spawnSync('agent-eval', argv, { stdio: capture ? 'pipe' : 'inherit', encoding: 'utf-8' });

/**
 * The evals `agent-eval run` would execute for each experiment. An experiment
 * with none is left out.
 *
 * This is the scan `run` does itself, not `agent-eval status`. `status` only
 * compares fingerprints, while `run` also reruns a result that never passed
 * and has no classification.json, since nothing says it was the model's fault.
 * Counting the same way keeps the plan equal to what gets billed, and stops
 * the retry loop only when `run` has nothing left.
 */
async function pending(experiments: readonly string[]): Promise<Map<string, string[]>> {
  const evalsDir = join(process.cwd(), 'evals');
  const fixtures = discoverFixtures(evalsDir);
  const work = new Map<string, string[]>();
  for (const name of experiments) {
    const loaded = await loadConfig(join(process.cwd(), 'experiments', `${name}.ts`));
    // A plain config has one model. agent-eval also takes a list, which names
    // its results differently.
    if (Array.isArray(loaded.model)) throw new Error(`experiments/${name}.ts lists several models.`);
    const config = { ...loaded, model: loaded.model };
    const fingerprints = Object.fromEntries(
      fixtures.map((fixture) => [fixture, computeFingerprint(join(evalsDir, fixture), config)]),
    );
    const reusable = scanReusableResults(join(process.cwd(), 'results'), name, fingerprints, {
      enforceReuseCompatibility: true,
      reuseCompatibilityFingerprint: computeReuseCompatibilityFingerprint(config),
    });
    const evals = fixtures.filter((fixture) => !reusable.has(fixture));
    if (evals.length > 0) work.set(name, evals);
  }
  return work;
}

const FIXED_LINES = new Set([
  '',
  "import type { ExperimentConfig } from '@vercel/agent-eval';",
  'const config: ExperimentConfig = {',
  '};',
  'export default config;',
]);
const FIELD = /^  agent: '(vercel-ai-gateway\/(claude-code|codex|opencode)|cursor|codex|claude-code)',$|^  model: '[\w./?=:-]+',$|^  sandbox: 'vercel',$|^  scripts: \['build'\],$|^  (runs|timeout): \d+,$|^  earlyExit: (true|false),$/;

/**
 * An experiment file is imported by the sweep, in the job that holds the
 * credentials. A registration pull request is written by an agent, so the file
 * has to be the plain config literal from AGENTS.md and nothing that runs.
 * `agentOptions` is left out on purpose: `cliPackage` picks the npm package
 * that runs next to the gateway key. An experiment that needs it is swept by
 * hand.
 */
function assertPlainConfig(name: string): string {
  const source = readFileSync(join('experiments', `${name}.ts`), 'utf-8');
  const odd = source.split('\n').filter((line) => !FIXED_LINES.has(line) && !/^  \/\/( .*)?$/.test(line) && !FIELD.test(line));
  if (odd.length > 0) {
    throw new Error(`experiments/${name}.ts is not a plain config, so CI will not run it:\n${odd.join('\n')}`);
  }
  return source;
}

const output = (key: string, value: string) => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
};
const summary = (markdown: string) => {
  console.log(markdown);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
};

function assertNames() {
  const bad = names.filter((name) => !/^[\w.-]+$/.test(name));
  if (bad.length > 0) throw new Error(`Not experiment names: ${bad.join(' ')}`);
}

async function plan() {
  assertNames();
  const tierOne = new Set<string>(TIER_ONE_EXPERIMENTS);
  const outside = names.filter((name) => !tierOne.has(name));
  if (outside.length > 0) {
    throw new Error(`Not in TIER_ONE_EXPERIMENTS, so never run here: ${outside.join(', ')}`);
  }

  const skipped: string[] = [];
  const runnable = (names.length > 0 ? names : [...TIER_ONE_EXPERIMENTS]).filter((name) => {
    if (/^  agent: 'vercel-ai-gateway\//m.test(assertPlainConfig(name))) return true;
    skipped.push(name);
    return false;
  });
  if (names.length > 0 && skipped.length > 0) {
    throw new Error(`Not a vercel-ai-gateway harness, CI has no credentials for it: ${skipped.join(', ')}`);
  }

  const work = await pending(runnable);
  // A smoke run checks access, so it runs even when nothing is missing.
  const experiments = smoke ? runnable : runnable.filter((name) => work.has(name));
  output('experiments', experiments.join(' '));
  output('count', String(experiments.length));

  if (experiments.length === 0) {
    summary('Every named experiment has a current result for every eval. Nothing to run.');
  } else {
    summary([
      smoke ? '### Smoke run, one eval per model' : '### Sweep waiting for approval',
      '',
      '| Experiment | Evals to run |',
      '|---|---|',
      ...experiments.map((name) => {
        const evals = work.get(name) ?? [];
        return `| \`${name}\` | ${smoke ? 1 : evals.length}${!smoke && evals.length <= 4 ? `: ${evals.join(', ')}` : ''} |`;
      }),
    ].join('\n'));
  }
  if (skipped.length > 0) summary(`\nNot run, no gateway harness: ${skipped.join(', ')}`);
}

async function sweep() {
  assertNames();
  if (names.length === 0) throw new Error('Name the experiments to sweep.');
  const tierOne = new Set<string>(TIER_ONE_EXPERIMENTS);
  const outside = registration ? [] : names.filter((name) => !tierOne.has(name));
  if (outside.length > 0) {
    throw new Error(`Not in TIER_ONE_EXPERIMENTS, so never run here: ${outside.join(', ')}`);
  }
  for (const name of names) assertPlainConfig(name);

  if (smoke) {
    // A smoke run always exits 1 and deletes its result. Its ✓ or ✗ line is the answer.
    agentEval(['run', '--smoke', ...names]);
    return;
  }

  const incomplete: string[] = [];
  // One experiment per process: agent-eval starts every experiment named in
  // one process at once.
  for (const name of names) {
    const resultsDir = join('results', name);
    const before = new Set(existsSync(resultsDir) ? readdirSync(resultsDir) : []);
    let left = (await pending([name])).get(name) ?? [];
    for (let pass = 1; left.length > 0 && pass <= MAX_PASSES; pass++) {
      console.log(`\n=== ${name}, pass ${pass}/${MAX_PASSES}, ${left.length} evals ===`);
      agentEval(['run', name]);
      left = (await pending([name])).get(name) ?? [];
    }
    if (left.length === 0) continue;
    incomplete.push(`\`${name}\`: ${left.join(', ')}`);
    // What this sweep left behind for an eval that is still pending is a
    // result `run` does not accept, like a failure the classifier never
    // judged. Remove it, or the export would publish it as the model failing.
    // Only this sweep's own directories: older results are not ours to drop.
    const created = existsSync(resultsDir) ? readdirSync(resultsDir).filter((entry) => !before.has(entry)) : [];
    for (const timestamp of created) {
      for (const evalName of left) rmSync(join(resultsDir, timestamp, evalName), { recursive: true, force: true });
    }
  }

  if (incomplete.length > 0) {
    summary(`### Still missing after ${MAX_PASSES} passes\n\n${incomplete.map((line) => `- ${line}`).join('\n')}\n\nThese rows stay off the board until a rerun completes them.`);
  } else {
    summary('Every swept experiment has a current result for every eval.');
  }
}

/**
 * A predecessor stays tier 1 until its successor has a complete run, marked in
 * tier-one.ts as `'<old>', // Until <new> has a complete run.`. Drop the lines
 * whose successor is now complete.
 */
async function promote() {
  const path = join('scripts', 'tier-one.ts');
  const lines = readFileSync(path, 'utf-8').split('\n');
  const marker = /^\s*'([\w.-]+)',\s*\/\/ Until ([\w.-]+) has a complete run\.$/;
  const successors = [...new Set(lines.flatMap((line) => line.match(marker)?.[2] ?? []))];
  if (successors.length === 0) return;

  const work = await pending(successors);
  const kept = lines.filter((line) => {
    const match = line.match(marker);
    if (!match || work.has(match[2])) return true;
    summary(`\`${match[1]}\` moves to tier 2, \`${match[2]}\` has a complete run.`);
    return false;
  });
  if (kept.length !== lines.length) writeFileSync(path, kept.join('\n'));
}

try {
  if (command === 'plan') await plan();
  else if (command === 'sweep') await sweep();
  else if (command === 'promote') await promote();
  else throw new Error('Usage: tsx scripts/ci.ts <plan|sweep|promote> [experiments...] [--smoke] [--registration]');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
