/**
 * The repository side of the agent's `sweep` tool (agent/tools/sweep.ts).
 * Everything here is free and runs locally too: the tool itself starts the
 * paid `agent-eval run` passes.
 *
 *   pnpm run sweep plan [experiments...] [--registration] [--smoke] [--json]
 *   pnpm run sweep pending <experiment>
 *   pnpm run sweep prune <experiment> --since <epoch ms>
 *   pnpm run sweep promote
 *   pnpm run sweep verify-pr <base> <head>
 *
 * `plan` with no name covers every tier-1 experiment. It refuses tier 2, since
 * those are never rerun, and anything that is not a gateway harness, since the
 * agent only holds gateway credentials. `--registration` accepts experiments a
 * pull request adds, which are not tier 1 on main yet.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  computeFingerprint,
  computeReuseCompatibilityFingerprint,
  discoverFixtures,
  loadConfig,
  scanReusableResults,
} from '@vercel/agent-eval';
import { TIER_ONE_EXPERIMENTS } from './tier-one.ts';

const [command, ...args] = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const names = args.filter((arg, index) => !arg.startsWith('--') && !args[index - 1]?.startsWith('--since'));

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
 * agent-eval imports the experiment file in the process that holds the
 * gateway token. A registration pull request is written by an agent, so the
 * file has to be the plain config literal from AGENTS.md and nothing that
 * runs. `agentOptions` is left out on purpose: `cliPackage` picks the npm
 * package that runs next to the token. An experiment that needs it is swept
 * by hand.
 */
function assertPlainConfig(name: string): string {
  const source = readFileSync(join('experiments', `${name}.ts`), 'utf-8');
  const odd = source.split('\n').filter((line) => !FIXED_LINES.has(line) && !/^  \/\/( .*)?$/.test(line) && !FIELD.test(line));
  if (odd.length > 0) {
    throw new Error(`experiments/${name}.ts is not a plain config, so the agent will not sweep it:\n${odd.join('\n')}`);
  }
  return source;
}

function assertNames(list: readonly string[]) {
  const bad = list.filter((name) => !/^[\w.-]+$/.test(name));
  if (bad.length > 0) throw new Error(`Not experiment names: ${bad.join(' ')}`);
}

async function plan() {
  assertNames(names);
  const smoke = flag('--smoke');
  const tierOne = new Set<string>(TIER_ONE_EXPERIMENTS);
  const outside = flag('--registration') ? [] : names.filter((name) => !tierOne.has(name));
  if (outside.length > 0) {
    throw new Error(`Not in TIER_ONE_EXPERIMENTS, so never run here: ${outside.join(', ')}`);
  }

  const skipped: string[] = [];
  const runnable = (names.length > 0 ? names : [...TIER_ONE_EXPERIMENTS]).filter((name) => {
    let source: string;
    try {
      source = assertPlainConfig(name);
    } catch (error) {
      // A named experiment is the caller's mistake. In a tier-1 sweep, one
      // odd config should not block every other model.
      if (names.length > 0) throw error;
      skipped.push(`${name} (not a plain config)`);
      return false;
    }
    if (/^  agent: 'vercel-ai-gateway\//m.test(source)) return true;
    skipped.push(`${name} (no gateway harness)`);
    return false;
  });
  if (names.length > 0 && skipped.length > 0) {
    throw new Error(`Not a vercel-ai-gateway harness, the agent has no credentials for it: ${skipped.join(', ')}`);
  }

  const work = await pending(runnable);
  // A smoke run checks access, so it runs even when nothing is missing.
  const experiments = (smoke ? runnable : runnable.filter((name) => work.has(name)))
    .map((name) => ({ name, evals: smoke ? 1 : (work.get(name) ?? []).length, missing: work.get(name) ?? [] }));

  if (flag('--json')) {
    console.log(JSON.stringify({ experiments, skipped }));
    return;
  }
  if (experiments.length === 0) {
    console.log('Every named experiment has a current result for every eval. Nothing to run.');
  } else {
    console.log([
      smoke ? 'Smoke run, one eval per model:' : 'Evals a sweep would run:',
      '',
      '| Experiment | Evals to run |',
      '|---|---|',
      ...experiments.map(({ name, evals, missing }) =>
        `| \`${name}\` | ${evals}${!smoke && missing.length <= 4 ? `: ${missing.join(', ')}` : ''} |`),
    ].join('\n'));
  }
  if (skipped.length > 0) console.log(`\nNot run: ${skipped.join(', ')}`);
}

/** The evals one experiment still has to run, as a JSON array. */
async function printPending() {
  assertNames(names);
  if (names.length !== 1) throw new Error('Name one experiment.');
  console.log(JSON.stringify((await pending(names)).get(names[0]) ?? []));
}

const timestampOf = (directory: string) =>
  Date.parse(directory.replace(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})\.(\d+)Z$/, '$1T$2:$3:$4.$5Z'));

/**
 * After the last pass, what a sweep left behind for an eval that is still
 * pending is a result `run` does not accept, like a failure the classifier
 * never judged. Remove it, or the export would publish it as the model
 * failing. Only result directories created since the sweep started: older
 * results are not the sweep's to drop.
 */
async function prune() {
  assertNames(names);
  const since = Number(option('--since'));
  if (names.length !== 1 || !Number.isFinite(since)) throw new Error('Usage: prune <experiment> --since <epoch ms>');
  const [name] = names;
  const left = (await pending([name])).get(name) ?? [];
  const resultsDir = join('results', name);
  if (left.length === 0 || !existsSync(resultsDir)) return;
  for (const directory of readdirSync(resultsDir)) {
    if (!(timestampOf(directory) >= since)) continue;
    for (const evalName of left) rmSync(join(resultsDir, directory, evalName), { recursive: true, force: true });
  }
  console.log(JSON.stringify(left));
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
    console.log(`\`${match[1]}\` moves to tier 2, \`${match[2]}\` has a complete run.`);
    return false;
  });
  if (kept.length !== lines.length) writeFileSync(path, kept.join('\n'));
}

/**
 * A sweep runs the export on a pull request's tree, so the pull request's
 * code runs in the agent's sandbox. Before that, check from main that the
 * pull request only adds data a registration needs: experiment files, rows in
 * the export and price tables, entries in the tier list, line comments, and
 * README lines.
 * Anything else is swept by hand.
 */
function verifyPr() {
  const [base, head] = names;
  if (!/^[0-9a-f]{40}$/.test(base ?? '') || !/^[0-9a-f]{40}$/.test(head ?? '')) throw new Error('Usage: verify-pr <base sha> <head sha>');
  const git = (...argv: string[]) => {
    const result = spawnSync('git', argv, { encoding: 'utf-8' });
    if (result.status !== 0) throw new Error(`git ${argv.join(' ')} failed: ${result.stderr}`);
    return result.stdout;
  };

  const problems: string[] = [];
  const files = git('diff', '--name-status', `${base}...${head}`).split('\n').filter(Boolean);
  // Prices are numbers and names are plain strings: a value that could call
  // anything is not a row.
  const ROW = /^ {2}'[\w.-]+': (\{( \w+: \d+(\.\d+)?,?)+ \}|'[^'\\]*'|null),$/;
  const TIER = /^ {2}'[\w.-]+',( \/\/ Until [\w.-]+ has a complete run\.)?$/;
  for (const line of files) {
    const [status, path] = line.split('\t');
    if (path === 'README.md' && status === 'M') continue;
    if (/^experiments\/[\w.-]+\.ts$/.test(path) && status === 'A') continue;
    const rule = path === 'scripts/export-results.ts' || path === 'scripts/cost.ts' ? ROW : path === 'scripts/tier-one.ts' ? TIER : null;
    if (!rule || status !== 'M') {
      problems.push(`${status} ${path}`);
      continue;
    }
    const changed = git('diff', '-U0', `${base}...${head}`, '--', path).split('\n')
      .filter((text) => /^[+-]/.test(text) && !/^(\+\+\+|---) /.test(text))
      .map((text) => text.slice(1));
    // A `//` line comment is inert, and registrations carry them (price sources).
    const odd = changed.filter((text) => !rule.test(text) && !/^ {2}\/\/( .*)?$/.test(text));
    if (odd.length > 0) problems.push(`${path}: ${odd.join(' | ')}`);
  }
  if (problems.length > 0) {
    throw new Error(`The pull request changes more than a registration's data, so the agent will not sweep it:\n${problems.join('\n')}`);
  }
}

try {
  if (command === 'plan') await plan();
  else if (command === 'verify-pr') verifyPr();
  else if (command === 'pending') await printPending();
  else if (command === 'prune') await prune();
  else if (command === 'promote') await promote();
  else throw new Error('Usage: pnpm run sweep <plan|pending|prune|promote|verify-pr> [arguments...]');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
