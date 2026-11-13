/**
 * Avoid Redundant Ref + Watch
 *
 * Tests whether the agent replaces redundant ref() + watch() patterns with
 * computed() for derived values. Verified against nuxt 4.6.4 (Vue 3.5).
 *
 * - The page uses computed() and no watch()/watchEffect() at all.
 * - `products` is the only piece of reactive state left. Any second
 *   ref/shallowRef/reactive/shallowReactive declaration is a hand-synced
 *   mirror of a derived value, whatever it is named, so it fails.
 * - The total, in-stock count, average price and remove button survive.
 *
 * `products` may be a ref, shallowRef or reactive, with or without a generic.
 * Tricky because agents often leave watch-based sync patterns in place or
 * replace them with other manually synced state instead of computed().
 * Checks run on comment-stripped source.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function getPageContent(): string {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  if (!pagePath) throw new Error('No page found');
  return stripComments(readFileSync(pagePath, 'utf-8'));
}

// Any reactive-state constructor, with an optional generic: ref<T>(, shallowRef(, reactive<T>(...
const STATE_CALL = String.raw`(?:ref|shallowRef|reactive|shallowReactive|customRef)\s*(?:<[^>]*>)?\s*\(`;

test('Uses computed for derived values', () => {
  const content = getPageContent();

  expect(content).toMatch(/computed\s*(?:<[^>]*>)?\s*\(/);
});

test('Does not use any watcher', () => {
  const content = getPageContent();

  // The whole point is to drop watch-based syncing in favour of computed.
  expect(content).not.toMatch(/\bwatch(?:Effect)?\s*\(/);
});

test('Has no extra reactive state beyond the products source of truth', () => {
  const content = getPageContent();

  const stateCount = (
    content.match(new RegExp(String.raw`(?:const|let)\s+\w+(?:\s*:[^=\n]+)?\s*=\s*` + STATE_CALL, 'g')) ?? []
  ).length;
  // Only `products` should remain reactive state; derived values must be computed.
  expect(stateCount).toBeLessThanOrEqual(1);

  // Belt and suspenders: the known derived values must not be reactive state.
  for (const name of ['totalProducts', 'inStockCount', 'averagePrice']) {
    expect(content).not.toMatch(new RegExp(String.raw`(?:const|let)\s+${name}\s*=\s*` + STATE_CALL));
  }
});

test('Still has products as reactive state', () => {
  const content = getPageContent();

  expect(content).toMatch(/products/);
  expect(content).toMatch(new RegExp(String.raw`\b` + STATE_CALL));
});

test('Still displays total count', () => {
  const content = getPageContent();

  expect(content).toMatch(/[Tt]otal/);
});

test('Still displays in-stock count', () => {
  const content = getPageContent();

  expect(content).toMatch(/[Ii]n\s*[Ss]tock/);
});

test('Still displays average price', () => {
  const content = getPageContent();

  expect(content).toMatch(/[Aa]verage/);
});

test('Still has remove functionality', () => {
  const content = getPageContent();

  expect(content).toMatch(/remove|Remove/);
});
