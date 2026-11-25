/** The slice of a sandbox handle these helpers need. */
export interface Runner {
  run(options: { command: string; env?: Record<string, string> }): PromiseLike<{ exitCode: number; stdout: string; stderr: string }>;
}

/** Untracked and ignored, next to the checkout: sweep logs and the running pass's pid. */
export const SWEEP_STATE = '.eve-sweep';

/**
 * Puts the checkout at the tip of `branch` and installs. Paid results a failed
 * sweep left behind survive, whether they are untracked, staged, or in a
 * commit that was never pushed: the mixed reset turns them back into
 * untracked files, which the forced checkout keeps, and the clean skips
 * `results/`.
 */
export async function syncBase(sandbox: Runner, branch: string): Promise<string> {
  await run(sandbox, `git fetch -q origin ${branch} && git reset -q FETCH_HEAD && git checkout -q -f --detach FETCH_HEAD && git clean -fdq -e ${SWEEP_STATE} -e results && pnpm install --frozen-lockfile`);
  return (await run(sandbox, 'git rev-parse HEAD')).trim();
}

/** Runs a command and throws on a nonzero exit, which `run()` itself does not. */
export async function run(sandbox: Runner, command: string, env?: Record<string, string>): Promise<string> {
  const result = await sandbox.run({ command, ...(env ? { env } : {}) });
  if (result.exitCode !== 0) {
    throw new Error(`Sandbox command failed (exit ${result.exitCode}): ${command}\n${(result.stderr.trim() || result.stdout.trim()).slice(-2000)}`);
  }
  return result.stdout;
}
