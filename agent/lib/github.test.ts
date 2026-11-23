/** Run with: pnpm run test:agent */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorize, MAINTAINER_GITHUB_ID } from './github.ts';

const maintainer = { principalId: `github:${MAINTAINER_GITHUB_ID}`, principalType: 'user', authenticator: 'github', attributes: {} };
const stranger = { ...maintainer, principalId: 'github:1' };
const schedule = { principalId: 'eve:app', principalType: 'runtime', authenticator: 'app', attributes: {} };

// The rules below are about commands, so they run as the maintainer.
process.env.VERCEL_ENV = 'production';
const run = (command: string, repository: string | null = 'nuxt/nuxt-evals', auth = maintainer) =>
  authorize({ argv: command.split(' '), repository, auth });

test('pull requests can be opened and edited, never merged or closed', () => {
  assert.equal(run('gh pr create --title x --body y'), true);
  assert.equal(run('gh pr edit 12 --title x'), true);
  assert.equal(run('gh pr list --state open'), true);
  assert.equal(run('gh pr merge 12 --squash'), false);
  assert.equal(run('gh pr close 12'), false);
  assert.equal(run('gh api -X DELETE repos/nuxt/nuxt-evals/git/refs/heads/main'), false);
  assert.equal(run('gh workflow run evals.yml'), false);
  assert.equal(run('gh secret list'), false);
});

test('pushes only reach agent branches, without force', () => {
  const push = 'git push --no-follow-tags origin';
  assert.equal(run(`${push} HEAD:refs/heads/agent/add-kimi-k4`), true);
  assert.equal(run('git push -u --no-follow-tags origin agent/add-kimi-k4:refs/heads/agent/add-kimi-k4'), true);
  assert.equal(run('git -C nuxt.com push --no-follow-tags origin HEAD:refs/heads/agent/evals-results', 'nuxt/nuxt.com'), true);
  // The destination of a bare ref comes from git config, which the sandbox owns.
  assert.equal(run(`${push} agent/add-kimi-k4`), false);
  assert.equal(run(`${push} HEAD:agent/add-kimi-k4`), false);
  assert.equal(run(`${push} main`), false);
  assert.equal(run(`${push} HEAD:refs/heads/main`), false);
  assert.equal(run(`${push} agent/add-x:refs/heads/main`), false);
  assert.equal(run(`${push} --force HEAD:refs/heads/agent/add-x`), false);
  assert.equal(run(`${push} +HEAD:refs/heads/agent/add-x`), false);
  assert.equal(run(`${push} --delete refs/heads/agent/add-x`), false);
  assert.equal(run(`${push} HEAD:refs/heads/agent/a HEAD:refs/heads/agent/b`), false);
  assert.equal(run('git push --no-follow-tags fork HEAD:refs/heads/agent/add-x'), false);
  assert.equal(run('git push origin HEAD:refs/heads/agent/add-x'), false);
  assert.equal(run('git -c push.followTags=true push --no-follow-tags origin HEAD:refs/heads/agent/add-x'), false);
  assert.equal(run('git push'), false);
});

test('reads are allowed, other repositories are not', () => {
  assert.equal(run('git fetch origin main'), true);
  assert.equal(run('git clone https://github.com/nuxt/nuxt.com.git', 'nuxt/nuxt.com'), true);
  assert.equal(run('gh pr create --title x', 'nuxt/nuxt'), false);
  assert.equal(run('gh pr list', null), false);
  assert.equal(run('gh-signed-commit -m x'), false);
});

test('only schedules and the maintainer get a token', () => {
  assert.equal(run('gh pr create --title x', 'nuxt/nuxt-evals', schedule), true);
  assert.equal(run('gh pr create --title x', 'nuxt/nuxt-evals', stranger), false);
  assert.equal(authorize({ argv: ['gh', 'pr', 'list'], repository: 'nuxt/nuxt-evals', auth: null }), false);
});

test('issues can be opened and edited, never closed', () => {
  assert.equal(run('gh issue create --title x'), true);
  assert.equal(run('gh issue edit 3 --body x'), true);
  assert.equal(run('gh issue close 3'), false);
  assert.equal(run('gh issue comment 3 --body x'), false);
});
