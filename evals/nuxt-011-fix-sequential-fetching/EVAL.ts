/**
 * Fix Sequential Fetching
 *
 * Tests whether the agent parallelizes two sequential await useFetch calls
 * using useAsyncData + Promise.all.
 *
 * Tricky because two sequential await useFetch calls work correctly but
 * block each other — the second waits for the first to complete. The agent
 * must know to wrap both in useAsyncData with Promise.all.
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

test('Uses parallel fetching with Promise.all', () => {
  const content = getPageContent();

  expect(content).toMatch(/Promise\.all/);
});

test('Uses useAsyncData or useFetch for parallel requests', () => {
  const content = getPageContent();

  // useAsyncData + $fetch is the canonical pattern, but useFetch inside Promise.all is also valid
  expect(content).toMatch(/useAsyncData|useFetch/);
});

test('Does not use sequential await useFetch calls', () => {
  const content = getPageContent();

  const useFetchCalls = content.match(/await\s+useFetch\s*\(/g);
  const hasSequential = useFetchCalls && useFetchCalls.length >= 2;

  expect(hasSequential).toBeFalsy();
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
