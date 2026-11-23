/**
 * Runs an agent-eval command on tier-1 experiments only, so an eval-set change
 * never reruns tier 2. Extra arguments are passed through.
 *
 *   pnpm run eval:tier1:status
 *   pnpm run eval:tier1
 *   pnpm run eval:tier1 -- --smoke
 *
 * `run` goes one experiment at a time by default. agent-eval starts every
 * experiment named in one process at once, so a full sweep of many models
 * opens hundreds of sandboxes together. Pass `--parallel` to run them all in
 * one process (sandbox starts still share agent-eval's 20 per 2s limiter),
 * which is fine when only a few experiments have work left.
 *
 *   pnpm run eval:tier1 -- --parallel
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { TIER_ONE_EXPERIMENTS } from './tier-one.ts';

const [command, ...args] = process.argv.slice(2);
if (command !== 'run' && command !== 'status') {
  console.error('Usage: tsx scripts/tier-one-cli.ts <run|status> [agent-eval options]');
  process.exit(1);
}
// pnpm 10 forwards the `--` from `pnpm run eval:tier1 -- --smoke`. Placed after
// the experiment names it would turn `--smoke` into an experiment name and run
// the full sweep, so drop it and pass options before the names.
const parallel = args.includes('--parallel');
const rest = args.filter((arg) => arg !== '--' && arg !== '--parallel');

// agent-eval prefers AI_GATEWAY_API_KEY over VERCEL_OIDC_TOKEN, so a personal
// key exported in the shell would bill every run to it. When the project token
// from `vercel env pull` is there, use that instead.
const env = { ...process.env };
const envLocal = existsSync('.env.local') ? readFileSync('.env.local', 'utf-8') : '';
if (/^VERCEL_OIDC_TOKEN=/m.test(envLocal) && env.AI_GATEWAY_API_KEY) {
  delete env.AI_GATEWAY_API_KEY;
  console.log('Ignoring AI_GATEWAY_API_KEY from the shell, using VERCEL_OIDC_TOKEN from .env.local');
}

// The OIDC token from `vercel env pull` lasts about 12 hours. An expired one
// fails every attempt with "AI Gateway authentication failed", which agent-eval
// files as an infra failure and deletes, so stop before paying for sandboxes.
const oidc = envLocal.match(/^VERCEL_OIDC_TOKEN="?([^"\n]+)"?/m)?.[1];
if (command === 'run' && oidc && !env.AI_GATEWAY_API_KEY) {
  try {
    const { exp } = JSON.parse(Buffer.from(oidc.split('.')[1], 'base64url').toString());
    const minutesLeft = Math.round((exp * 1000 - Date.now()) / 60_000);
    if (minutesLeft < 60) {
      console.error(minutesLeft <= 0
        ? 'VERCEL_OIDC_TOKEN in .env.local has expired. Run `vercel env pull` first.'
        : `VERCEL_OIDC_TOKEN in .env.local expires in ${minutesLeft} min. Run \`vercel env pull\` first.`);
      process.exit(1);
    }
  } catch {
    // Not a JWT we can read; let agent-eval report any auth problem.
  }
}

const agentEval = (cmd: string, extra: readonly string[], names: readonly string[], capture = false) =>
  spawnSync('agent-eval', [cmd, ...extra, ...names], { env, stdio: capture ? 'pipe' : 'inherit', encoding: 'utf-8' });

if (command === 'status') process.exit(agentEval('status', rest, TIER_ONE_EXPERIMENTS).status ?? 1);

if (parallel) {
  // Only name experiments with work left, so idle ones don't print noise.
  const pending = agentEval('status', ['--json'], TIER_ONE_EXPERIMENTS, true);
  const names = (JSON.parse(pending.stdout.slice(pending.stdout.indexOf('{'))).work as Array<{ experiment: string; new: string[]; changed: string[] }>)
    .filter((w) => w.new.length + w.changed.length > 0)
    .map((w) => w.experiment);
  if (names.length > 0) agentEval('run', rest, names);
} else {
  for (const name of TIER_ONE_EXPERIMENTS) {
    console.log(`\n=== ${name} ===`);
    agentEval('run', rest, [name]);
  }
}

if (rest.includes('--smoke')) process.exit(0);

// agent-eval's exit code reflects failed evals, not missing work, so report
// what is still outstanding instead.
const status = agentEval('status', ['--json'], TIER_ONE_EXPERIMENTS, true);
const work: Array<{ experiment: string; new: string[]; changed: string[] }> =
  JSON.parse(status.stdout.slice(status.stdout.indexOf('{'))).work;
const missing = work.filter((w) => w.new.length + w.changed.length > 0);
if (missing.length === 0) {
  console.log('\nEvery tier-1 experiment has a current result for every eval.');
} else {
  console.error('\nStill missing (infra failures are deleted, rerun to retry):');
  for (const w of missing) console.error(`  ${w.experiment}: ${[...w.new, ...w.changed].join(', ')}`);
  process.exit(1);
}
