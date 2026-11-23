import { defineSandbox } from 'eve/sandbox';
import { VERCEL_EVE_GIT_SANDBOX_IMAGE, VercelSandbox } from 'eve/sandbox/vercel';
import { installCodeTooling } from 'eve/extensions/code/sandbox';
import { run } from '../lib/sandbox';

const REPOSITORY = 'https://github.com/nuxt/nuxt-evals.git';

export const environment = VercelSandbox.environment({
  image: VERCEL_EVE_GIT_SANDBOX_IMAGE,
  // Captured in the snapshot every session starts from: the gh wrappers and pnpm.
  prepare: async (sandbox) => {
    await installCodeTooling(sandbox);
    await run(sandbox, 'npm install --global pnpm@10');
  },
});

export default defineSandbox(async () => {
  // A sweep keeps agent-eval running in here for an hour or more while the
  // workflow checks on it every few minutes. A background process does not
  // count as activity, but each check is a sandbox operation, which eve uses
  // to extend Vercel's timeout. The session stays open during a sweep, so
  // eve's idle stop does not apply. 2 hours is the longest timeout tested.
  // If the sandbox is lost mid-pass anyway, the next pass reruns what is
  // missing.
  const sandbox = await environment.open({ resources: { vcpus: 2 }, timeout: 2 * 60 * 60 * 1000 });
  // The repository is the workspace root, where the GitHub channel checks out
  // pull requests too. It is public, so this needs no credential. Safe to
  // repeat: this can run more than once against the same sandbox.
  await run(sandbox, `[ -d .git ] || { git init -q && git remote add origin ${REPOSITORY}; }`);
  await run(sandbox, 'git fetch -q origin main && git checkout -q -f -B main origin/main && pnpm install --frozen-lockfile');
  return sandbox;
});
