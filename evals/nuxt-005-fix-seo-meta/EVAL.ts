/**
 * Fix SEO Meta Tags
 *
 * Tests whether the agent replaces verbose useHead meta arrays with
 * Nuxt's ergonomic useSeoMeta composable — keeping every tag (title,
 * description, the full Open Graph set, and the full Twitter set) and the
 * original values intact.
 *
 * Tricky because useHead with meta arrays works fine, but useSeoMeta is the
 * recommended Nuxt pattern. A partial conversion that drops half the tags, or
 * one that keeps the raw `property: 'og:...'` array entries, is not the fix.
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

test('Page does not keep raw og:/twitter: property entries', () => {
  const content = getPageContent();

  // useSeoMeta uses flat camelCase keys; the raw array-entry style must be gone.
  expect(content).not.toMatch(/property\s*:\s*['"]og:/);
  expect(content).not.toMatch(/name\s*:\s*['"]twitter:/);
});

test('Page sets title and description', () => {
  const content = getPageContent();

  expect(content).toMatch(/title/);
  expect(content).toMatch(/description/);
});

test('Page sets the full Open Graph set (title, description, image)', () => {
  const content = getPageContent();

  expect(content).toMatch(/ogTitle/);
  expect(content).toMatch(/ogDescription/);
  expect(content).toMatch(/ogImage/);
});

test('Page sets the full Twitter card set (card, title, description)', () => {
  const content = getPageContent();

  expect(content).toMatch(/twitterCard/);
  expect(content).toMatch(/twitterTitle/);
  expect(content).toMatch(/twitterDescription/);
});

test('Original meta values are preserved', () => {
  const content = getPageContent();

  expect(content).toMatch(/My Website - Home/);
  expect(content).toMatch(/Welcome to my awesome website built with Nuxt\./);
  expect(content).toMatch(/https:\/\/example\.com\/og-image\.png/);
});

test('Page still displays content', () => {
  const content = getPageContent();

  expect(content).toMatch(/Welcome/i);
});
