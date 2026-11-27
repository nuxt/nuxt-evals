/** The slice of a sandbox handle these helpers need. */
export interface Runner {
  run(options: { command: string; env?: Record<string, string> }): PromiseLike<{ exitCode: number; stdout: string; stderr: string }>;
}

/**
 * The open policy the sandbox runs with between GitHub commands. The GitHub
 * channel adds the App's installation token for github.com at the firewall
 * when a turn starts, and that token expires after an hour. A sweep turn lasts
 * longer, so later fetches of the public repository went out with an expired
 * token and GitHub answered 401. Resetting to this policy first makes them
 * anonymous again, which a public repository allows.
 */
export const OPEN_POLICY = { allow: { '*': [] } } as const;

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
  // The GitHub channel checks pull requests out with depth 1, which makes the
  // repository shallow. Ancestry checks and three-dot diffs then fail as if
  // the branch were behind main, so the full history comes back first.
  // Background gc or maintenance after a fetch can rewrite the shallow file
  // mid-fetch ("shallow file has changed since we read it"), so it is off.
  await run(sandbox, `[ "$(git rev-parse --is-shallow-repository)" = false ] || git -c gc.auto=0 -c maintenance.auto=false fetch -q --unshallow origin`);
  await run(sandbox, `git -c gc.auto=0 -c maintenance.auto=false fetch -q origin ${branch} && git reset -q FETCH_HEAD && git checkout -q -f --detach FETCH_HEAD && git clean -fdq -e ${SWEEP_STATE} -e results && pnpm install --frozen-lockfile`);
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
