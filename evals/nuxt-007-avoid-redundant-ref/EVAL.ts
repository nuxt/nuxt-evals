/**
 * Avoid Redundant Ref + Watch
 *
 * Tests whether the agent replaces redundant ref() + watch() patterns
 * with computed() for derived values. After the fix there should be no
 * watchers at all and no extra refs mirroring values derivable from products.
 *
 * Tricky because agents often leave watch-based sync patterns in place
 * or replace them with other ref-based patterns instead of computed().
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function getPageContent(): string {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  if (!pagePath) throw new Error('No page found');
  return readFileSync(pagePath, 'utf-8');
}

test('Uses computed for derived values', () => {
  const content = getPageContent();

  expect(content).toMatch(/computed\s*\(/);
});

test('Does not use any watcher', () => {
  const content = getPageContent();

  // The whole point is to drop watch-based syncing in favour of computed.
  expect(content).not.toMatch(/\bwatch(?:Effect)?\s*\(/);
});

test('Has no extra refs beyond the products source of truth', () => {
  const content = getPageContent();

  const refCount = (content.match(/(?:const|let)\s+\w+\s*=\s*ref\s*[<(]/g) ?? []).length;
  // Only `products` should remain a ref; derived values must be computed.
  expect(refCount).toBeLessThanOrEqual(1);

  // Belt and suspenders: the known derived values must not be refs.
  expect(content).not.toMatch(/(?:const|let)\s+totalProducts\s*=\s*ref\s*\(/);
  expect(content).not.toMatch(/(?:const|let)\s+inStockCount\s*=\s*ref\s*\(/);
  expect(content).not.toMatch(/(?:const|let)\s+averagePrice\s*=\s*ref\s*\(/);
});

test('Still has products as reactive state', () => {
  const content = getPageContent();

  expect(content).toMatch(/products/);
  expect(content).toMatch(/ref\s*[<(]|reactive\s*\(/);
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
