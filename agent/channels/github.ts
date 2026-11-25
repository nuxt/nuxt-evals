import { connectGitHubCredentials } from '@vercel/connect/eve';
import { defaultGitHubAuth, githubChannel } from 'eve/channels/github';
import { BOT_NAME, CONNECTOR, MAINTAINER_GITHUB_ID, REPOSITORY } from '../lib/github';

const MENTION = new RegExp(`(^|\\s)@${BOT_NAME}\\b`, 'i');

/**
 * The maintainer talks to the agent in pull request and issue comments on
 * nuxt/nuxt-evals: `@nuxt-evals sweep` on a registration pull request is the
 * approval that starts a paid sweep. Nobody else's comment starts a turn, so a
 * public thread can't spend money or put text in front of the model.
 */
export default githubChannel({
  botName: BOT_NAME,
  credentials: connectGitHubCredentials(CONNECTOR),
  onComment: (ctx, comment) => {
    if (ctx.repository.fullName.toLowerCase() !== REPOSITORY) return null;
    if (comment.author?.id !== MAINTAINER_GITHUB_ID || ctx.sender.id !== MAINTAINER_GITHUB_ID) return null;
    if (!MENTION.test(comment.body)) return null;
    return { auth: defaultGitHubAuth(ctx) };
  },
});
