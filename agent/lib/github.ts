import { connectGitHubCredentials } from '@vercel/connect/eve';
import type { SessionAuthContext } from 'eve/context';
import type { GitHubAppAuthorizeRequest, GitHubLeaseBroker } from 'eve/extensions/git';
import { isScheduleAuth } from 'eve/schedules';

import { BOT_EMAIL, LEGACY_BOT_EMAILS } from './identity';

export { BOT_EMAIL, BOT_NAME_IN_COMMITS } from './identity';

/** The Vercel Connect connector of the agent's GitHub App. */
export const CONNECTOR = 'github/nuxt-evals';

/** One set of Connect credentials for the channel and the dashboard tool. */
export const credentials = connectGitHubCredentials(CONNECTOR);

/** A REST call to GitHub as the App, from the runtime. The token never enters the sandbox. */
export async function githubApi<T>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown): Promise<T> {
  const token = typeof credentials.installationToken === 'function' ? await credentials.installationToken() : credentials.installationToken;
  if (!token) throw new Error('No GitHub installation token from Vercel Connect.');
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'user-agent': 'nuxt-evals-agent',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`GitHub ${method} ${path} failed: ${response.status} ${(await response.text()).slice(0, 300)}`);
  return response.json() as Promise<T>;
}

/** The invocation token in comments, without the `@`: the App's slug. */
export const BOT_NAME = 'nuxt-evals';

/** The benchmark. Registrations, sweeps and results happen here. */
export const REPOSITORY = 'nuxt/nuxt-evals';

/**
 * The branch the agent works from: its scripts run with the gateway token, so
 * a deployment always uses `main`. Under `eve dev`, `NUXT_EVALS_BASE_BRANCH`
 * points it at a branch under test.
 */
export const BASE_BRANCH = process.env.VERCEL === undefined && /^[\w./-]+$/.test(process.env.NUXT_EVALS_BASE_BRANCH ?? '')
  ? process.env.NUXT_EVALS_BASE_BRANCH!
  : 'main';

/** Where registrations go, and where the results are published. */
const REPOSITORIES = new Set([REPOSITORY, 'nuxt/nuxt.com']);

/** benjamincanac. The only person whose comments start a turn. */
export const MAINTAINER_GITHUB_ID = 739984;

/** `defaultGitHubAuth` names a GitHub sender `github:<id>`. */
export const isMaintainer = (auth: SessionAuthContext | null | undefined): boolean =>
  auth?.principalId === `github:${MAINTAINER_GITHUB_ID}`;

/**
 * Sweeps spend money, so only the maintainer's own comment starts one. `eve
 * dev` runs on the maintainer's machine, where there is no GitHub sender: its
 * localhost-only `local-dev` caller may too, and only off Vercel.
 */
export const mayStartSweeps = (auth: SessionAuthContext | null | undefined): boolean =>
  isMaintainer(auth) || (auth?.principalType === 'local-dev' && process.env.VERCEL === undefined);

/** Turns that may write to GitHub: the schedules, and the maintainer's comments. */
export const mayWrite = (auth: SessionAuthContext | null | undefined): boolean =>
  isScheduleAuth(auth ?? null) || mayStartSweeps(auth);

/**
 * The only refspec the agent pushes: a source and a fully qualified `agent/*`
 * destination. A bare `agent/x` is refused because its destination then comes
 * from the sandbox's own configuration, which the agent can edit.
 */
const AGENT_REFSPEC = /^[\w./-]+:refs\/heads\/agent\/[\w.-]+$/;
/** The branches the agent may rebase and force push: its registrations. */
const REGISTRATION_REFSPEC = /^[\w./-]+:refs\/heads\/(agent\/add-[\w.-]+)$/;

/**
 * Whether every commit `branch` has on top of main is the agent's own, like
 * Renovate before it rebases one of its branches. A branch someone else
 * pushed to is never rewritten. It asks GitHub with the token minted for the
 * command, before the command runs.
 */
async function onlyAgentCommits(repository: string, branch: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repository}/compare/main...${encodeURIComponent(branch)}`, {
      headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${token}`, 'user-agent': 'nuxt-evals-agent' },
    });
    if (!response.ok) return false;
    const { commits, total_commits: total } = await response.json() as {
      commits: Array<{ commit: { author: { email?: string } | null; committer: { email?: string } | null } }>;
      total_commits: number;
    };
    // The compare API lists at most 250 commits. A comparison it cut short
    // can't prove every commit is the agent's, so it counts as a no.
    if (commits.length === 0 || commits.length !== total) return false;
    const ours = (email: string | undefined) => email === BOT_EMAIL || LEGACY_BOT_EMAILS.includes(email ?? '');
    return commits.every(({ commit }) => ours(commit.author?.email) && ours(commit.committer?.email));
  } catch {
    return false;
  }
}

const GH_ALLOWED = new Set(['pr create', 'pr edit', 'pr list', 'pr view', 'pr diff', 'issue create', 'issue edit', 'issue list', 'issue view']);
const GIT_READS = new Set(['clone', 'fetch', 'ls-remote', 'pull']);

/**
 * The agent's whole GitHub access. A command gets a token only when this
 * returns true, so the rules live here and not in the instructions: turns
 * started by a schedule or the maintainer, two repositories, pull requests and
 * issues it may open and edit but never merge or close, and pushes to
 * `agent/*` branches without force. Branch protection on `main` is still the
 * backstop on GitHub's side.
 */
export async function authorize({ argv, repository, auth, token }: Pick<GitHubAppAuthorizeRequest, 'argv' | 'repository' | 'auth'> & { token?: string }): Promise<boolean> {
  if (!mayWrite(auth)) return false;
  if (repository === null || !REPOSITORIES.has(repository.toLowerCase())) return false;
  const [bin, ...rest] = argv;

  if (bin === 'gh') return GH_ALLOWED.has(rest.slice(0, 2).join(' '));

  if (bin === 'git') {
    // `-C dir` comes before the subcommand. `-c key=value` is refused.
    const args = [...rest];
    while (args[0] === '-C') {
      if (args[1] === undefined || args[1].startsWith('-')) return false;
      args.splice(0, 2);
    }
    const [subcommand, ...options] = args;
    if (subcommand === undefined) return false;
    if (GIT_READS.has(subcommand)) return true;
    if (subcommand !== 'push') return false;
    const positional = options.filter((arg) => !arg.startsWith('-'));
    const flags = options.filter((arg) => arg.startsWith('-'));
    // `git push --no-follow-tags origin <src>:refs/heads/agent/<name>`: one
    // remote, one branch, no tag, nothing that deletes.
    const plain = positional.length === 2
      && positional[0] === 'origin'
      && AGENT_REFSPEC.test(positional[1])
      && flags.includes('--no-follow-tags');
    if (!plain) return false;
    const rewrites = flags.filter((flag) => flag !== '--no-follow-tags' && flag !== '-u' && flag !== '--set-upstream');
    if (rewrites.length === 0) return true;
    // A rebased registration: `--force-with-lease` only, which refuses to
    // overwrite a push it hasn't seen, and only on a branch with nothing but
    // the agent's commits.
    const registration = positional[1].match(REGISTRATION_REFSPEC)?.[1];
    if (rewrites.length !== 1 || rewrites[0] !== '--force-with-lease' || !registration || repository.toLowerCase() !== REPOSITORY || !token) return false;
    return onlyAgentCommits(REPOSITORY, registration, token);
  }

  // gh-signed-commit: neither repository requires signed commits.
  return false;
}

const OPEN = { allow: { '*': [] } };

/**
 * Puts the GitHub credential on the sandbox firewall for one command and takes
 * it off after, so the token never reaches a sandbox process. Everything else
 * stays reachable: the agent reads the gateway catalog and upstream configs.
 */
export const brokerGitHubLease: GitHubLeaseBroker = async (sandbox, rules) => {
  const live = sandbox as typeof sandbox & { setNetworkPolicy?: (policy: unknown) => Promise<void> };
  if (typeof live.setNetworkPolicy !== 'function') {
    throw new Error('GitHub access needs a sandbox with a network policy, which is Vercel Sandbox.');
  }
  await live.setNetworkPolicy(rules === null ? OPEN : { allow: { ...rules, '*': [] } });
};
