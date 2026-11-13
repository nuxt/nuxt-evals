/**
 * Runs an agent-eval command on tier-1 experiments only, so an eval-set change
 * never reruns tier 2. Extra arguments are passed through.
 *
 *   pnpm run eval:tier1:status
 *   pnpm run eval:tier1
 *   pnpm run eval:tier1 -- --smoke
 *
 * `run` goes one experiment at a time. agent-eval starts every experiment
 * named in one process at once, so a full sweep of several new models would
 * open hundreds of sandboxes together and hit 429s.
 */
import { spawnSync } from 'node:child_process';
import { TIER_ONE_EXPERIMENTS } from './tier-one.ts';

const [command, ...args] = process.argv.slice(2);
if (command !== 'run' && command !== 'status') {
  console.error('Usage: tsx scripts/tier-one-cli.ts <run|status> [agent-eval options]');
  process.exit(1);
}
// pnpm 10 forwards the `--` from `pnpm run eval:tier1 -- --smoke`. Placed after
// the experiment names it would turn `--smoke` into an experiment name and run
// the full sweep, so drop it and pass options before the names.
const rest = args.filter((arg) => arg !== '--');

const agentEval = (names: readonly string[]) =>
  spawnSync('agent-eval', [command, ...rest, ...names], { stdio: 'inherit' }).status ?? 1;

if (command === 'status') process.exit(agentEval(TIER_ONE_EXPERIMENTS));

const failed: string[] = [];
for (const name of TIER_ONE_EXPERIMENTS) {
  console.log(`\n=== ${name} ===`);
  if (agentEval([name]) !== 0) failed.push(name);
}
if (failed.length > 0) {
  console.error(`\nNon-zero exit for: ${failed.join(', ')}. A smoke run always exits 1, read its ✓/✗ line instead.`);
  process.exit(1);
}
