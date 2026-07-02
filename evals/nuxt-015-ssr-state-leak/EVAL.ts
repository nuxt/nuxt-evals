/**
 * SSR-safe shared state (avoid module-level singletons)
 *
 * Tests whether the agent stores cross-request shared state with useState
 * instead of a module-level ref()/reactive() singleton. A module-level store is
 * created once per server process, so it is SHARED across every request and
 * user — one user's data leaks into another's response during SSR. useState
 * scopes the state per request while still persisting across client-side
 * navigation.
 *
 * Wrong-prior: the SPA/Vue habit of a module-level reactive() store looks
 * correct and works locally (a single client), so the leak is invisible without
 * a real server handling concurrent requests. The prompt is constructive ("build
 * a shared profile composable") and never mentions the leak, so the model must
 * reach for useState on its own rather than the module-singleton habit.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function collectVueFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectVueFiles(full));
    else if (entry.endsWith('.vue')) out.push(full);
  }
  return out;
}

function getProfileComposable(): string {
  const dir = join(process.cwd(), 'app', 'composables');
  if (!existsSync(dir)) throw new Error('No composables directory found');
  const file = readdirSync(dir).find(f => f.toLowerCase().includes('profile'));
  if (!file) throw new Error('No profile composable found');
  return readFileSync(join(dir, file), 'utf-8');
}

test('Profile composable exists', () => {
  const dir = join(process.cwd(), 'app', 'composables');
  expect(existsSync(dir)).toBe(true);
  expect(readdirSync(dir).some(f => f.toLowerCase().includes('profile'))).toBe(true);
});

test('Uses useState for the shared profile', () => {
  // useState is request-scoped on the server yet shared across navigation.
  expect(getProfileComposable()).toMatch(/useState/);
});

test('Does not use a module-level ref/reactive singleton', () => {
  const content = getProfileComposable();

  // A top-level (unindented) `const x = ref(/reactive(` is instantiated once per
  // server process and shared across all requests — the cross-user leak.
  const hasModuleSingleton = /^(?:export\s+)?const\s+\w+\s*=\s*(?:ref|reactive)\s*\(/m.test(content);
  expect(hasModuleSingleton).toBe(false);
});

test('Composable exposes the profile and an updater', () => {
  const content = getProfileComposable();

  expect(content).toMatch(/\breturn\b/);
  expect(content).toMatch(/set|update/i);
});

test('Shared profile is consumed on at least two pages', () => {
  const files = collectVueFiles(join(process.cwd(), 'app', 'pages'));
  const consumers = files.filter(f => /useProfile\s*\(/.test(readFileSync(f, 'utf-8')));

  // Two consumers prove the state genuinely persists across navigation.
  expect(consumers.length).toBeGreaterThanOrEqual(2);
});
