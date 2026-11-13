/**
 * Fix SEO Meta Tags
 *
 * Tests whether the agent replaces the verbose useHead meta array with
 * useSeoMeta, keeping every tag the page had (title, description, og:title,
 * og:description, og:image, og:url, twitter:card, twitter:title,
 * twitter:description) and the original values. Verified on nuxt 4.6.4.
 *
 * Tricky because useHead with meta arrays works fine, but useSeoMeta is the
 * recommended Nuxt pattern. A partial conversion that drops tags, or one that
 * keeps any `meta:` entries or raw `property: 'og:...'` keys, is not the fix.
 * Wrapping useSeoMeta in `if (import.meta.server)` passes, since that is the
 * documented replacement for the deprecated useServerSeoMeta. All checks run
 * on comment-stripped source, so naming the keys in a comment scores nothing.
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
  return stripComments(readFileSync(pagePath, 'utf-8'));
}

function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

test('Page uses useSeoMeta', () => {
  const content = getPageContent();

  expect(content).toMatch(/useSeoMeta\s*\(/);
});

test('Page does not use verbose meta arrays', () => {
  const content = getPageContent();

  // Should NOT have meta: [{ name: ..., content: ... }] pattern
  expect(content).not.toMatch(/\bmeta\s*:/);
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

test('Page sets the full Open Graph set (title, description, image, url)', () => {
  const content = getPageContent();

  expect(content).toMatch(/ogTitle/);
  expect(content).toMatch(/ogDescription/);
  expect(content).toMatch(/ogImage/);
  expect(content).toMatch(/ogUrl\s*:/);
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
  expect(content).toMatch(/['"`]https:\/\/example\.com['"`]/);
  expect(content).toMatch(/twitterCard\s*:\s*['"`]summary_large_image['"`]/);
});

test('Page still displays content', () => {
  const content = getPageContent();

  expect(content).toMatch(/Welcome/i);
});
