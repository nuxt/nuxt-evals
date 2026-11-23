/** The slice of a sandbox handle these helpers need. */
export interface Runner {
  run(options: { command: string; env?: Record<string, string> }): PromiseLike<{ exitCode: number; stdout: string; stderr: string }>;
}

/** Runs a command and throws on a nonzero exit, which `run()` itself does not. */
export async function run(sandbox: Runner, command: string, env?: Record<string, string>): Promise<string> {
  const result = await sandbox.run({ command, ...(env ? { env } : {}) });
  if (result.exitCode !== 0) {
    throw new Error(`Sandbox command failed (exit ${result.exitCode}): ${command}\n${(result.stderr.trim() || result.stdout.trim()).slice(-2000)}`);
  }
  return result.stdout;
}
