import type { GitHubAppAuthorizeRequest, GitHubLeaseBroker } from 'eve/extensions/git';

/** The Vercel Connect connector of the agent's GitHub App. */
export const CONNECTOR = 'github/nuxt-evals';

/** Where registrations go, and where the results are published. */
const REPOSITORIES = new Set(['nuxt/nuxt-evals', 'nuxt/nuxt.com']);

/** The only branches the agent pushes. */
const AGENT_REF = /^(HEAD:)?(refs\/heads\/)?agent\/[\w.-]+$/;

const GH_ALLOWED = new Set(['pr create', 'pr edit', 'pr list', 'pr view', 'pr diff']);
const GIT_READS = new Set(['clone', 'fetch', 'ls-remote', 'pull']);

/**
 * The agent's whole GitHub access. A command gets a token only when this
 * returns true, so the rules live here and not in the instructions: two
 * repositories, pull requests it may open and edit but never merge or close,
 * and pushes to `agent/*` branches without force.
 */
export function authorize({ argv, repository }: Pick<GitHubAppAuthorizeRequest, 'argv' | 'repository'>): boolean {
  if (repository === null || !REPOSITORIES.has(repository.toLowerCase())) return false;
  const [bin, ...rest] = argv;

  if (bin === 'gh') return GH_ALLOWED.has(rest.slice(0, 2).join(' '));

  if (bin === 'git') {
    // Global options (`-C dir`, `-c key=value`) come before the subcommand.
    const args = [...rest];
    while (args[0] === '-C' || args[0] === '-c') args.splice(0, 2);
    const [subcommand, ...options] = args;
    if (subcommand === undefined) return false;
    if (GIT_READS.has(subcommand)) return true;
    if (subcommand !== 'push') return false;
    const positional = options.filter((arg) => !arg.startsWith('-'));
    const flags = options.filter((arg) => arg.startsWith('-'));
    // `git push origin <ref>`: one remote, one ref, nothing that rewrites or deletes.
    return positional.length === 2
      && AGENT_REF.test(positional[1])
      && flags.every((flag) => flag === '-u' || flag === '--set-upstream');
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
