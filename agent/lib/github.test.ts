/** Run with: pnpm run test:agent */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorize, BOT_EMAIL, MAINTAINER_GITHUB_ID } from './github.ts';

const maintainer = { principalId: `github:${MAINTAINER_GITHUB_ID}`, principalType: 'user', authenticator: 'github', attributes: {} };
const stranger = { ...maintainer, principalId: 'github:1' };
const schedule = { principalId: 'eve:app', principalType: 'runtime', authenticator: 'app', attributes: {} };

// The rules below are about commands, so they run as the maintainer.
process.env.VERCEL_ENV = 'production';
const run = (command: string, repository: string | null = 'nuxt/nuxt-evals', auth = maintainer, token = 'test-token') =>
  authorize({ argv: command.split(' '), repository, auth, token });

/** GitHub's compare API, answering with commits by these emails. */
function stubCompare(emails: string[], total = emails.length) {
  globalThis.fetch = (async () => new Response(JSON.stringify({
    commits: emails.map((email) => ({ commit: { author: { email }, committer: { email } } })),
    total_commits: total,
  }))) as typeof fetch;
}

test('pull requests can be opened and edited, never merged or closed', async () => {
  assert.equal(await run('gh pr create --title x --body y'), true);
  assert.equal(await run('gh pr edit 12 --title x'), true);
  assert.equal(await run('gh pr list --state open'), true);
  assert.equal(await run('gh pr merge 12 --squash'), false);
  assert.equal(await run('gh pr close 12'), false);
  assert.equal(await run('gh api -X DELETE repos/nuxt/nuxt-evals/git/refs/heads/main'), false);
  assert.equal(await run('gh workflow run evals.yml'), false);
  assert.equal(await run('gh secret list'), false);
});

test('pushes only reach agent branches, without force', async () => {
  const push = 'git push --no-follow-tags origin';
  assert.equal(await run(`${push} HEAD:refs/heads/agent/add-kimi-k4`), true);
  assert.equal(await run('git push -u --no-follow-tags origin agent/add-kimi-k4:refs/heads/agent/add-kimi-k4'), true);
  assert.equal(await run('git -C nuxt.com push --no-follow-tags origin HEAD:refs/heads/agent/evals-results', 'nuxt/nuxt.com'), true);
  // The destination of a bare ref comes from git config, which the sandbox owns.
  assert.equal(await run(`${push} agent/add-kimi-k4`), false);
  assert.equal(await run(`${push} HEAD:agent/add-kimi-k4`), false);
  assert.equal(await run(`${push} main`), false);
  assert.equal(await run(`${push} HEAD:refs/heads/main`), false);
  assert.equal(await run(`${push} agent/add-x:refs/heads/main`), false);
  assert.equal(await run(`${push} --force HEAD:refs/heads/agent/add-x`), false);
  assert.equal(await run(`${push} +HEAD:refs/heads/agent/add-x`), false);
  assert.equal(await run(`${push} --delete refs/heads/agent/add-x`), false);
  assert.equal(await run(`${push} HEAD:refs/heads/agent/a HEAD:refs/heads/agent/b`), false);
  assert.equal(await run('git push --no-follow-tags fork HEAD:refs/heads/agent/add-x'), false);
  assert.equal(await run('git push origin HEAD:refs/heads/agent/add-x'), false);
  assert.equal(await run('git -c push.followTags=true push --no-follow-tags origin HEAD:refs/heads/agent/add-x'), false);
  assert.equal(await run('git push'), false);
  assert.equal(await run('git -C -c push --no-follow-tags origin HEAD:refs/heads/agent/add-x'), false);
});

test('reads are allowed, other repositories are not', async () => {
  assert.equal(await run('git fetch origin main'), true);
  assert.equal(await run('git clone https://github.com/nuxt/nuxt.com.git', 'nuxt/nuxt.com'), true);
  assert.equal(await run('gh pr create --title x', 'nuxt/nuxt'), false);
  assert.equal(await run('gh pr list', null), false);
  assert.equal(await run('gh-signed-commit -m x'), false);
});

test('only schedules and the maintainer get a token', async () => {
  const local = { principalId: 'local-dev', principalType: 'local-dev', authenticator: 'local-dev', attributes: {} };
  assert.equal(await run('gh pr list', 'nuxt/nuxt-evals', local), true);
  process.env.VERCEL = '1';
  assert.equal(await run('gh pr list', 'nuxt/nuxt-evals', local), false);
  delete process.env.VERCEL;
  assert.equal(await run('gh pr create --title x', 'nuxt/nuxt-evals', schedule), true);
  assert.equal(await run('gh pr create --title x', 'nuxt/nuxt-evals', stranger), false);
  assert.equal(await authorize({ argv: ['gh', 'pr', 'list'], repository: 'nuxt/nuxt-evals', auth: null }), false);
});

test('issues can be opened and edited, never closed', async () => {
  assert.equal(await run('gh issue create --title x'), true);
  assert.equal(await run('gh issue edit 3 --body x'), true);
  assert.equal(await run('gh issue close 3'), false);
  assert.equal(await run('gh issue comment 3 --body x'), false);
});

test('the agent rebases its own registrations, like Renovate', async () => {
  const force = 'git push --no-follow-tags --force-with-lease origin HEAD:refs/heads/agent/add-kimi-k4';
  stubCompare([BOT_EMAIL]);
  assert.equal(await run(force), true);
  // Someone else pushed to it: never rewritten.
  stubCompare([BOT_EMAIL, 'someone@example.com']);
  assert.equal(await run(force), false);
  // A comparison the API cut short proves nothing.
  stubCompare([BOT_EMAIL], 300);
  assert.equal(await run(force), false);
  stubCompare([BOT_EMAIL]);
  // Only registrations, only on nuxt-evals, only with a lease.
  assert.equal(await run('git push --no-follow-tags --force-with-lease origin HEAD:refs/heads/agent/results-2026-11-27'), false);
  assert.equal(await run(force, 'nuxt/nuxt.com'), false);
  assert.equal(await run('git push --no-follow-tags --force origin HEAD:refs/heads/agent/add-kimi-k4'), false);
  assert.equal(await run('git push --no-follow-tags --force-with-lease --delete origin HEAD:refs/heads/agent/add-kimi-k4'), false);
  assert.equal(await run(force, 'nuxt/nuxt-evals', maintainer, ''), false);
});
