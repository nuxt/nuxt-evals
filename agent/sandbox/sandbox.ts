import { defineSandbox } from 'eve/sandbox';
import { VERCEL_EVE_GIT_SANDBOX_IMAGE, VercelSandbox } from 'eve/sandbox/vercel';
import { installCodeTooling } from 'eve/extensions/code/sandbox';

const REPOSITORY = 'https://github.com/nuxt/nuxt-evals.git';

async function run(sandbox: { run(options: { command: string }): PromiseLike<{ exitCode: number; stdout: string; stderr: string }> }, command: string) {
  // run() resolves with an exit code instead of throwing.
  const result = await sandbox.run({ command });
  if (result.exitCode !== 0) {
    throw new Error(`Sandbox command failed (exit ${result.exitCode}): ${command}\n${result.stderr.trim() || result.stdout.trim()}`);
  }
}

export const environment = VercelSandbox.environment({
  image: VERCEL_EVE_GIT_SANDBOX_IMAGE,
  // Captured in the snapshot every session starts from: the gh wrappers and pnpm.
  prepare: async (sandbox) => {
    await installCodeTooling(sandbox);
    await run(sandbox, 'npm install --global pnpm@10');
  },
});

export default defineSandbox(async () => {
  const sandbox = await environment.open({ resources: { vcpus: 2 } });
  // The repository is public, so the clone needs no credential. Safe to
  // repeat: this can run more than once against the same sandbox.
  await run(sandbox, `[ -d nuxt-evals/.git ] || git clone ${REPOSITORY} nuxt-evals`);
  await run(sandbox, 'cd nuxt-evals && git fetch origin main && git checkout -f -B main origin/main && pnpm install --frozen-lockfile');
  return sandbox;
});
