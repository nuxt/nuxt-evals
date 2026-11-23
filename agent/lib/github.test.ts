/** Run with: pnpm run test:agent */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorize } from './github.ts';

const run = (command: string, repository: string | null = 'nuxt/nuxt-evals') =>
  authorize({ argv: command.split(' '), repository });

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
  assert.equal(run('git push origin agent/add-kimi-k4'), true);
  assert.equal(run('git push -u origin HEAD:agent/add-kimi-k4'), true);
  assert.equal(run('git -C nuxt-evals push origin agent/evals-results', 'nuxt/nuxt.com'), true);
  assert.equal(run('git push origin main'), false);
  assert.equal(run('git push origin HEAD:main'), false);
  assert.equal(run('git push origin agent/add-x:main'), false);
  assert.equal(run('git push --force origin agent/add-kimi-k4'), false);
  assert.equal(run('git push origin +agent/add-kimi-k4'), false);
  assert.equal(run('git push origin --delete agent/add-kimi-k4'), false);
  assert.equal(run('git push origin agent/add-a agent/add-b'), false);
  assert.equal(run('git push'), false);
});

test('reads are allowed, other repositories are not', () => {
  assert.equal(run('git fetch origin main'), true);
  assert.equal(run('git clone https://github.com/nuxt/nuxt.com.git', 'nuxt/nuxt.com'), true);
  assert.equal(run('gh pr create --title x', 'nuxt/nuxt'), false);
  assert.equal(run('gh pr list', null), false);
  assert.equal(run('gh-signed-commit -m x'), false);
});
