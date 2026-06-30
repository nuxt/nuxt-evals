/**
 * Fix Sequential Fetching
 *
 * Tests whether the agent parallelizes two data fetches that the starter
 * awaits sequentially (each await blocks the next).
 *
 * Any valid parallelization is accepted: Promise.all over useFetch or $fetch,
 * the canonical useAsyncData(() => Promise.all([$fetch, $fetch])), or multiple
 * non-awaited useFetch/useAsyncData calls. The eval fails any solution that
 * keeps the two requests sequentially awaited — including two awaited $fetch
 * calls (a common "fix" that is still sequential).
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

test('Still uses a Nuxt data-fetching primitive', () => {
  const content = getPageContent();

  // The fix should stay within Nuxt data fetching, not drop to raw fetch in onMounted
  expect(content).toMatch(/useFetch|useAsyncData|useLazyFetch|useLazyAsyncData|\$fetch/);
});

test('Parallelizes the two requests', () => {
  const content = getPageContent();

  // The starter blocks by awaiting two requests one after another. A real fix
  // either wraps them in Promise.all, or stops awaiting them sequentially.
  // Counting *any* awaited fetch (useFetch/useAsyncData/$fetch) closes the
  // "two awaited $fetch calls" loophole, which is still sequential.
  const usesPromiseAll = /Promise\.all/.test(content);
  const awaitedFetches = (
    content.match(/await\s+(?:\$fetch|use(?:Lazy)?(?:Fetch|AsyncData))\s*(?:<[^>]*>)?\s*\(/g) ?? []
  ).length;

  expect(usesPromiseAll || awaitedFetches < 2).toBe(true);
});

test('Still fetches user data from jsonplaceholder', () => {
  const content = getPageContent();

  expect(content).toMatch(/jsonplaceholder\.typicode\.com\/users/);
});

test('Still fetches posts data', () => {
  const content = getPageContent();

  // Accept a literal id, a template variable (e.g. users/${userId}/posts),
  // or the generic /posts endpoint
  expect(content).toMatch(
    /jsonplaceholder\.typicode\.com\/users\/[^/'"`]+\/posts|jsonplaceholder\.typicode\.com\/posts/
  );
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
