/**
 * Fix Sequential Fetching
 *
 * Tests whether the agent parallelizes two sequential data fetches using
 * the canonical useAsyncData + Promise.all([$fetch]) pattern.
 *
 * Tricky because sequential await useFetch calls work correctly but block
 * each other. Many agents wrap useFetch in Promise.all which doesn't
 * actually parallelize properly. The correct Nuxt pattern is:
 * useAsyncData(() => Promise.all([$fetch(...), $fetch(...)]))
 * https://nuxt.com/docs/4.x/getting-started/data-fetching#making-parallel-requests
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

test('Uses useAsyncData to wrap parallel requests', () => {
  const content = getPageContent();

  // https://nuxt.com/docs/4.x/getting-started/data-fetching#making-parallel-requests
  // The canonical pattern is useAsyncData + Promise.all([$fetch, $fetch])
  expect(content).toMatch(/useAsyncData/);
});

test('Uses Promise.all with $fetch for parallel fetching', () => {
  const content = getPageContent();

  expect(content).toMatch(/Promise\.all/);
  expect(content).toMatch(/\$fetch/);
});

test('Does not use useFetch for parallel requests', () => {
  const content = getPageContent();

  // useFetch is a convenience wrapper; for parallel requests the docs
  // recommend useAsyncData + $fetch so both calls share one Suspense block
  expect(content).not.toMatch(/useFetch/);
});

test('Still fetches user data from jsonplaceholder', () => {
  const content = getPageContent();

  expect(content).toMatch(/jsonplaceholder\.typicode\.com\/users/);
});

test('Still fetches posts data', () => {
  const content = getPageContent();

  expect(content).toMatch(/jsonplaceholder\.typicode\.com\/users\/1\/posts|jsonplaceholder\.typicode\.com\/posts/);
});

test('Still displays user name and email', () => {
  const content = getPageContent();

  expect(content).toMatch(/name/i);
  expect(content).toMatch(/email/i);
});

test('Still displays post titles in a list', () => {
  const content = getPageContent();

  expect(content).toMatch(/v-for/);
  expect(content).toMatch(/title/i);
});
