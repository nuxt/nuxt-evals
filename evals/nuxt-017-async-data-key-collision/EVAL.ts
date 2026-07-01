/**
 * Fix a useAsyncData key collision
 *
 * The starter calls useAsyncData twice with the SAME key ('data'). Nuxt caches
 * and de-duplicates by key, so both calls share one cache entry — the two
 * panels can render whichever response resolved first, showing the same list.
 *
 * The fix is to give each call a unique key (or switch to useFetch, which
 * derives a distinct key per URL automatically).
 *
 * Wrong-prior: models don't realise Nuxt de-dupes by key and reuse a generic
 * key, so the bug survives naive edits.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function getPageContent(): string {
  const p = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );
  if (!p) throw new Error('No page found');
  return readFileSync(p, 'utf-8');
}

test('Fetches both the products and categories endpoints', () => {
  const content = getPageContent();

  expect(content).toMatch(/\/api\/products/);
  expect(content).toMatch(/\/api\/categories/);
});

test('Uses a Nuxt data-fetching primitive', () => {
  expect(getPageContent()).toMatch(/useAsyncData|useFetch/);
});

test('Data-fetching keys are unique (no shared cache key)', () => {
  const content = getPageContent();

  // Positional useAsyncData keys + explicit `key:` options must not repeat.
  const positional = [...content.matchAll(/useAsyncData\s*(?:<[^>]*>)?\s*\(\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  const explicit = [...content.matchAll(/\bkey\s*:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  const keys = [...positional, ...explicit];

  expect(keys.length).toBe(new Set(keys).size);
});
