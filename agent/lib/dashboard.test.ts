/** Run with: pnpm test:agent */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actionsInComment, newlyChecked, renderDashboard, runningLine } from './dashboard.ts';

const state = {
  tier1: [{ name: 'gemini-4-carbon', evals: 2, missing: ['nuxt-020-fix-nuxt-module', 'nuxt-021-custom-fetch-client'] }],
  smokeModels: 12,
  registrations: [{ number: 71, title: 'feat(experiments): add kimi-k4' }],
  running: null,
  updatedAt: new Date('2026-11-25T11:00:00Z'),
};

const check = (body: string, id: string) => body.replace(` - [ ] <!-- ${id} -->`, ` - [x] <!-- ${id} -->`);

test('a newly checked box becomes its action', () => {
  const body = renderDashboard(state);
  assert.deepEqual(newlyChecked(body, check(body, 'sweep-tier1')), [{ id: 'sweep-tier1' }]);
  assert.deepEqual(newlyChecked(body, check(body, 'sweep-pr-71')), [{ id: 'sweep-pr-71', pullRequest: 71 }]);
  assert.deepEqual(
    newlyChecked(body, check(check(body, 'smoke-tier1'), 'run-model-watch')),
    [{ id: 'smoke-tier1' }, { id: 'run-model-watch' }],
  );
});

test('editing anything else starts nothing', () => {
  const body = renderDashboard(state);
  assert.deepEqual(newlyChecked(body, body.replace('Tier 1', 'Tier one')), []);
  // A box that was already checked, or one that appears checked out of nowhere.
  const checked = check(body, 'sweep-tier1');
  assert.deepEqual(newlyChecked(checked, checked), []);
  assert.deepEqual(newlyChecked(body, `${body}\n - [x] <!-- sweep-pr-99 -->Sweep #99`), []);
  // Unknown ids are dropped.
  assert.deepEqual(newlyChecked(' - [ ] <!-- rm-rf -->x', ' - [x] <!-- rm-rf -->x'), []);
});

test('the running line survives a refresh and clears', () => {
  const running = renderDashboard({ ...state, running: 'Sweep of #71 started 11:00 UTC.' });
  assert.equal(runningLine(running), 'Sweep of #71 started 11:00 UTC.');
  assert.equal(runningLine(renderDashboard(state)), null);
});

test('a comment names actions by id', () => {
  assert.deepEqual(actionsInComment('@nuxt-evals sweep-tier1'), [{ id: 'sweep-tier1' }]);
  assert.deepEqual(actionsInComment('@nuxt-evals sweep-pr-71 then run-publish-results, sweep-pr-71'), [
    { id: 'sweep-pr-71', pullRequest: 71 },
    { id: 'run-publish-results' },
  ]);
  assert.deepEqual(actionsInComment('@nuxt-evals what is left?'), []);
  assert.deepEqual(actionsInComment('@nuxt-evals not-sweep-tier1x'), []);
});

test('an empty tier 1 has no sweep box', () => {
  const body = renderDashboard({ ...state, tier1: [], registrations: [] });
  assert.equal(body.includes('<!-- sweep-tier1 -->'), false);
  assert.match(body, /Every tier-1 model has a current result/);
});
