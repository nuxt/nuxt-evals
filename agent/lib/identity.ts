/**
 * The App's bot account, which every commit the agent makes is authored as.
 * The noreply address with the bot's user id is what GitHub links to
 * `nuxt-evals[bot]`. No imports: the sweep's workflow bundle loads this.
 */
export const BOT_NAME_IN_COMMITS = 'nuxt-evals[bot]';
export const BOT_EMAIL = '361069101+nuxt-evals[bot]@users.noreply.github.com';

/**
 * Addresses the agent picked for itself before the identity was pinned, on
 * #78. Still the agent's, so those branches can be rebased.
 */
export const LEGACY_BOT_EMAILS = ['agent@users.noreply.github.com', 'nuxt-evals@users.noreply.github.com'];

/** Pins the identity in the sandbox, so the agent never picks its own. */
export const SET_GIT_IDENTITY = `git config --global user.name '${BOT_NAME_IN_COMMITS}' && git config --global user.email '${BOT_EMAIL}'`;
