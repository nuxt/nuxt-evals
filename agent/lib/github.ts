import type { GitHubAppAuthorizeRequest, GitHubLeaseBroker } from 'eve/extensions/git';

/** The Vercel Connect connector of the agent's GitHub App. */
export const CONNECTOR = 'github/nuxt-evals';

/** Where registrations go, and where the results are published. */
const REPOSITORIES = new Set(['nuxt/nuxt-evals', 'nuxt/nuxt.com']);

/**
 * The only refspec the agent pushes: a source and a fully qualified `agent/*`
 * destination. A bare `agent/x` is refused because its destination then comes
 * from the sandbox's own configuration, which the agent can edit.
 */
const AGENT_REFSPEC = /^[\w./-]+:refs\/heads\/agent\/[\w.-]+$/;

const GH_ALLOWED = new Set(['pr create', 'pr edit', 'pr list', 'pr view', 'pr diff']);
const GIT_READS = new Set(['clone', 'fetch', 'ls-remote', 'pull']);

/**
 * The agent's whole GitHub access. A command gets a token only when this
 * returns true, so the rules live here and not in the instructions: two
 * repositories, pull requests it may open and edit but never merge or close,
 * and pushes to `agent/*` branches without force. Branch protection on
 * `main` is still the backstop on GitHub's side.
 */
export function authorize({ argv, repository }: Pick<GitHubAppAuthorizeRequest, 'argv' | 'repository'>): boolean {
  if (repository === null || !REPOSITORIES.has(repository.toLowerCase())) return false;
  const [bin, ...rest] = argv;

  if (bin === 'gh') return GH_ALLOWED.has(rest.slice(0, 2).join(' '));

  if (bin === 'git') {
    // `-C dir` comes before the subcommand. `-c key=value` is refused.
    const args = [...rest];
    while (args[0] === '-C') args.splice(0, 2);
    const [subcommand, ...options] = args;
    if (subcommand === undefined) return false;
    if (GIT_READS.has(subcommand)) return true;
    if (subcommand !== 'push') return false;
    const positional = options.filter((arg) => !arg.startsWith('-'));
    const flags = options.filter((arg) => arg.startsWith('-'));
    // `git push --no-follow-tags origin <src>:refs/heads/agent/<name>`: one
    // remote, one branch, no tag, nothing that rewrites or deletes.
    return positional.length === 2
      && positional[0] === 'origin'
      && AGENT_REFSPEC.test(positional[1])
      && flags.includes('--no-follow-tags')
      && flags.every((flag) => flag === '--no-follow-tags' || flag === '-u' || flag === '--set-upstream');
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
