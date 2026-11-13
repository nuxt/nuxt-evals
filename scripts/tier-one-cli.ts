/**
 * Runs an agent-eval command on tier-1 experiments only, so an eval-set change
 * never reruns tier 2. Extra arguments are passed through.
 *
 *   pnpm run eval:tier1:status
 *   pnpm run eval:tier1
 *   pnpm run eval:tier1 -- --smoke
 */
import { spawnSync } from 'node:child_process';
import { TIER_ONE_EXPERIMENTS } from './tier-one.ts';

const [command, ...args] = process.argv.slice(2);
// pnpm 10 forwards the `--` from `pnpm run eval:tier1 -- --smoke`. Placed after
// the experiment names it would turn `--smoke` into an experiment name and run
// the full sweep, so drop it and pass options before the names.
const rest = args.filter((arg) => arg !== '--');
if (command !== 'run' && command !== 'status') {
  console.error('Usage: tsx scripts/tier-one-cli.ts <run|status> [agent-eval options]');
  process.exit(1);
}

const { status } = spawnSync('agent-eval', [command, ...rest, ...TIER_ONE_EXPERIMENTS], { stdio: 'inherit' });
process.exit(status ?? 1);
