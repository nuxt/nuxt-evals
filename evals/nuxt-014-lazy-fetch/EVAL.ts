/**
 * Nuxt Lazy Data Fetching
 *
 * Tests whether the agent uses lazy data fetching (lazy: true or useLazyFetch)
 * with proper loading state handling via the status return value.
 *
 * Tricky because agents often block navigation with default useFetch (no lazy),
 * use a manual ref for loading state instead of the built-in status, or
 * use onMounted + fetch with a loading ref instead of Nuxt composables.
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
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  if (!pagePath) {
    throw new Error('No page found');
  }

  return readFileSync(pagePath, 'utf-8');
}

test('Page exists', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();
});

test('Uses lazy data fetching', () => {
  const content = getPageContent();

  // Should use lazy: true option or useLazyFetch/useLazyAsyncData
  expect(content).toMatch(/lazy\s*:\s*true|useLazyFetch|useLazyAsyncData/);
});

test('Fetches from jsonplaceholder API', () => {
  const content = getPageContent();

  expect(content).toMatch(/jsonplaceholder\.typicode\.com/);
});

test('Uses status for loading state', () => {
  const content = getPageContent();

  // Should destructure status from the composable (not create a manual loading ref)
  expect(content).toMatch(/status/);
});

test('Template handles pending state', () => {
  const content = getPageContent();

  // Should show loading indicator when status is pending
  expect(content).toMatch(/pending|loading|Loading/i);
});

test('Does not use onMounted + fetch anti-pattern', () => {
  const content = getPageContent();

  const hasAntiPattern = /onMounted[\s\S]*?fetch\(/.test(content);
  expect(hasAntiPattern).toBe(false);
});

test('Does not use manual loading ref', () => {
  const content = getPageContent();

  // Should NOT create a manual loading ref — use status from composable instead
  const hasManualLoading = /const\s+loading\s*=\s*ref\(|let\s+loading\s*=\s*ref\(/i.test(content);
  expect(hasManualLoading).toBe(false);
});

test('Displays post titles', () => {
  const content = getPageContent();

  expect(content).toMatch(/title/i);
  expect(content).toMatch(/v-for/);
});
