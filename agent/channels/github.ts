import { defaultGitHubAuth, githubChannel } from 'eve/channels/github';
import { DASHBOARD_MARKER, newlyChecked } from '../lib/dashboard';
import { BOT_NAME, credentials, MAINTAINER_GITHUB_ID, REPOSITORY } from '../lib/github';

const MENTION = new RegExp(`(^|\\s)@${BOT_NAME}\\b`, 'i');

/**
 * The maintainer runs the agent from the Evals Dashboard issue: checking a box
 * is the approval that starts a paid sweep. Comments that mention the bot
 * start a turn too, to ask it something. Nobody else's edit or comment starts
 * a turn, so a public thread can't spend money or put text in front of the
 * model.
 */
export default githubChannel({
  botName: BOT_NAME,
  credentials,
  // The dashboard is one thread, so its turns queue: two checked boxes never
  // run two sweeps at once, which would be rate limited on sandbox creation.
  turnPolicy: 'queue',
  onIssue: (ctx, issue) => {
    if (issue.action !== 'edited' || ctx.repository.fullName.toLowerCase() !== REPOSITORY) return null;
    if (ctx.sender.id !== MAINTAINER_GITHUB_ID) return null;
    const raw = issue.raw as { issue?: { body?: unknown }; changes?: { body?: { from?: unknown } } };
    const body = raw.issue?.body;
    const before = raw.changes?.body?.from;
    if (typeof body !== 'string' || typeof before !== 'string' || !body.includes(DASHBOARD_MARKER)) return null;
    const actions = newlyChecked(before, body);
    if (actions.length === 0) return null;
    return {
      auth: defaultGitHubAuth(ctx),
      title: `Dashboard: ${actions.map(({ id }) => id).join(', ')}`,
      context: [`This turn's request: the maintainer checked ${actions.map(({ id }) => `\`${id}\``).join(', ')} on the Evals Dashboard (#${issue.issueNumber}). Load the dashboard skill and run exactly these. Earlier requests in this thread were handled by earlier turns.`],
    };
  },
  onComment: (ctx, comment) => {
    if (ctx.repository.fullName.toLowerCase() !== REPOSITORY) return null;
    if (comment.author?.id !== MAINTAINER_GITHUB_ID || ctx.sender.id !== MAINTAINER_GITHUB_ID) return null;
    if (!MENTION.test(comment.body)) return null;
    return { auth: defaultGitHubAuth(ctx) };
  },
});
