/**
 * Prepare a Nuxt 4 app for Nuxt 5
 *
 * Nuxt 5 is opt-in from Nuxt 4.2+ via `future: { compatibilityVersion: 5 }`.
 * The starter also uses two patterns the modern data-fetching API has moved on
 * from:
 *   - `dedupe: true`  → the boolean is deprecated; use `'cancel'` (or `'defer'`)
 *   - `data.value === null` → `data` defaults to `undefined` (not `null`) since
 *     Nuxt 4, so a `=== null` guard never matches; compare to `undefined`.
 *
 * Wrong-prior: models on Nuxt 3 knowledge don't set compatibilityVersion, keep
 * the `dedupe` boolean, and null-check the data. The prompt names the goal
 * (ready for Nuxt 5, update deprecated data-fetching patterns) but not the APIs.
 * https://nuxt.com/docs/4.x/getting-started/upgrade
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function getConfig(): string {
  return readFileSync(join(process.cwd(), 'nuxt.config.ts'), 'utf-8');
}

function getPageContent(): string {
  const p = [
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  ].find(existsSync);
  if (!p) throw new Error('No page found');
  return readFileSync(p, 'utf-8');
}

test('Opts into the Nuxt 5 compatibility version', () => {
  // future: { compatibilityVersion: 5 }
  expect(getConfig()).toMatch(/compatibilityVersion\s*:\s*5/);
});

test('Uses the current dedupe value, not the deprecated boolean', () => {
  const content = getPageContent();

  expect(content).not.toMatch(/dedupe\s*:\s*true/);
  expect(content).not.toMatch(/dedupe\s*:\s*false/);
});

test('Does not guard fetched data with === null (v4/v5 default is undefined)', () => {
  const content = getPageContent();

  expect(content).not.toMatch(/\.value\s*===\s*null/);
});

test('Still fetches the user', () => {
  const content = getPageContent();

  expect(content).toMatch(/useFetch|useAsyncData/);
  expect(content).toMatch(/\/api\/user/);
});
