import { defineSandbox } from 'eve/sandbox';
import { VercelSandbox } from 'eve/sandbox/vercel';
import { installCodeTooling } from 'eve/extensions/code/sandbox';
import { BASE_BRANCH, BOT_EMAIL, BOT_NAME_IN_COMMITS } from '../lib/github';
import { run } from '../lib/sandbox';

const REPOSITORY = 'https://github.com/nuxt/nuxt-evals.git';

export const environment = VercelSandbox.environment({
  // eve's default image. Its eve-git variant, which adds gh, isn't served to
  // this team ("Image not found"), so installCodeTooling installs gh instead.
  // Captured in the snapshot every session starts from: gh, its wrappers and pnpm.
  prepare: async (sandbox) => {
    await installCodeTooling(sandbox);
    await run(sandbox, 'npm install --global pnpm@10');
    // Every commit the agent makes is authored as the App's bot account.
    await run(sandbox, `git config --global user.name '${BOT_NAME_IN_COMMITS}' && git config --global user.email '${BOT_EMAIL}'`);
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
  await run(sandbox, `git fetch -q origin ${BASE_BRANCH} && git checkout -q -f -B main FETCH_HEAD && pnpm install --frozen-lockfile`);
  return sandbox;
});
