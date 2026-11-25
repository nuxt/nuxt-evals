/** Run with: pnpm test:agent */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actionsInComment, newlyChecked, passProgress, renderDashboard, runningLine, withRunningLine } from './dashboard.ts';

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

test('the running line survives a refresh while it is current', () => {
  const running = renderDashboard({ ...state, running: 'Sweep of #71 started 11:00 UTC.' });
  assert.equal(runningLine(running, new Date('2026-11-25T11:15:00Z')), 'Sweep of #71 started 11:00 UTC.');
  // Left behind by a turn that ended without clearing it.
  assert.equal(runningLine(running, new Date('2026-11-25T13:00:00Z')), null);
  // Across midnight.
  const late = renderDashboard({ ...state, running: 'Sweep of #71: pass 1 of 4. Checked 23:55 UTC.' });
  assert.equal(runningLine(late, new Date('2026-11-26T00:05:00Z')), 'Sweep of #71: pass 1 of 4. Checked 23:55 UTC.');
  // No time, no way to tell: dropped.
  assert.equal(runningLine(renderDashboard({ ...state, running: 'Sweep of tier 1 started (sweep-tier1).' })), null);
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

test('a progress line replaces the running line and nothing else', () => {
  const body = renderDashboard(state);
  const updated = withRunningLine(body, 'Sweep of tier 1: gemini-4-carbon, pass 1/4, 3 of 8 runs finished.');
  assert.equal(updated!.includes('Sweep of tier 1: gemini-4-carbon, pass 1/4, 3 of 8 runs finished.'), true);
  assert.equal(updated!.replace(/<!-- running -->\n.*\n/, ''), body.replace(/<!-- running -->\n.*\n/, ''));
  assert.equal(withRunningLine('no dashboard here', 'x'), null);
});

test('pass progress comes from the agent-eval log', () => {
  const log = [
    'Starting 8 eval attempts concurrently (2 evals × 4 runs)',
    'Running gemini-4-carbon/nuxt-020-fix-nuxt-module [1/4] [vercel-ai-gateway/opencode]...',
    '✗ gemini-4-carbon/nuxt-020-fix-nuxt-module [1/4] (vercel-ai-gateway/opencode) (996.1s) - fetch failed',
    '✓ gemini-4-carbon/nuxt-021-custom-fetch-client [2/4] (vercel-ai-gateway/opencode) (412.0s)',
    '✗ nuxt-020-fix-nuxt-module: 0/1 passed (0%)',
  ].join('\n');
  assert.deepEqual(passProgress(log), { started: 8, finished: 2, passed: 1 });
  assert.deepEqual(passProgress(''), { started: 0, finished: 0, passed: 0 });
});

test('an empty tier 1 has no sweep box', () => {
  const body = renderDashboard({ ...state, tier1: [], registrations: [] });
  assert.equal(body.includes('<!-- sweep-tier1 -->'), false);
  assert.match(body, /Every tier-1 model has a current result/);
});
