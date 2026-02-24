/**
 * Avoid Redundant Ref + Watch
 *
 * Tests whether the agent replaces redundant ref() + watch() patterns
 * with computed() for derived values.
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

test('Does not use watch for derived values', () => {
  const content = getPageContent();

  // Should NOT use watch to sync derived state
  expect(content).not.toMatch(/watch\s*\(\s*products/);
});

test('Does not use separate refs for calculated values', () => {
  const content = getPageContent();

  // Should NOT have ref() for values derivable from products
  expect(content).not.toMatch(/(?:const|let)\s+totalProducts\s*=\s*ref\s*\(/);
  expect(content).not.toMatch(/(?:const|let)\s+inStockCount\s*=\s*ref\s*\(/);
  expect(content).not.toMatch(/(?:const|let)\s+averagePrice\s*=\s*ref\s*\(/);
});

test('Still has products as reactive state', () => {
  const content = getPageContent();

  // Products should still be a ref (it's the source of truth)
  expect(content).toMatch(/products/);
  expect(content).toMatch(/ref\s*[<(]/);
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
