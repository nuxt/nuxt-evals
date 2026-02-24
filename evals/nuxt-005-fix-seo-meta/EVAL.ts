/**
 * Fix SEO Meta Tags
 *
 * Tests whether the agent replaces verbose useHead meta arrays with
 * Nuxt's ergonomic useSeoMeta composable.
 *
 * Tricky because useHead with meta arrays works fine, but useSeoMeta
 * is the recommended Nuxt pattern — more readable, type-safe, and
 * avoids common mistakes like wrong property/name attributes.
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

test('Page uses useSeoMeta', () => {
  const content = getPageContent();

  expect(content).toMatch(/useSeoMeta/);
});

test('Page does not use verbose meta arrays', () => {
  const content = getPageContent();

  // Should NOT have meta: [{ name: ..., content: ... }] pattern
  expect(content).not.toMatch(/meta\s*:\s*\[/);
});

test('Page sets title and description', () => {
  const content = getPageContent();

  expect(content).toMatch(/title/);
  expect(content).toMatch(/description/);
});

test('Page sets Open Graph tags', () => {
  const content = getPageContent();

  expect(content).toMatch(/ogTitle|ogDescription|ogImage/);
});

test('Page sets Twitter card tags', () => {
  const content = getPageContent();

  expect(content).toMatch(/twitterCard|twitterTitle|twitterDescription/);
});

test('Page still displays content', () => {
  const content = getPageContent();

  expect(content).toMatch(/Welcome/i);
});
