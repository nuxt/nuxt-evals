/**
 * Nuxt Parallel Data Fetching
 *
 * Tests whether the agent fetches multiple resources in parallel using
 * useAsyncData + Promise.all instead of sequential awaits.
 *
 * Tricky because agents often write sequential await calls:
 *   const { data: user } = await useFetch('/api/user')
 *   const { data: posts } = await useFetch('/api/posts')
 * instead of parallel:
 *   const { data } = await useAsyncData(() => Promise.all([...]))
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

  if (!pagePath) {
    throw new Error('No page found');
  }

  return readFileSync(pagePath, 'utf-8');
}

test('Page exists', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();
});

test('Fetches user data from jsonplaceholder', () => {
  const content = getPageContent();

  expect(content).toMatch(/jsonplaceholder\.typicode\.com\/users/);
});

test('Fetches posts data from jsonplaceholder', () => {
  const content = getPageContent();

  expect(content).toMatch(/jsonplaceholder\.typicode\.com\/users\/1\/posts|jsonplaceholder\.typicode\.com\/posts/);
});

test('Uses parallel fetching with Promise.all', () => {
  const content = getPageContent();

  // Should use Promise.all for parallel requests
  expect(content).toMatch(/Promise\.all/);
});

test('Uses useAsyncData for parallel requests', () => {
  const content = getPageContent();

  // Should wrap Promise.all in useAsyncData
  expect(content).toMatch(/useAsyncData/);
});

test('Does not use sequential await useFetch calls', () => {
  const content = getPageContent();

  // Should NOT have two separate await useFetch calls (sequential anti-pattern)
  const useFetchCalls = content.match(/await\s+useFetch\s*\(/g);
  const hasSequential = useFetchCalls && useFetchCalls.length >= 2;

  expect(hasSequential).toBeFalsy();
});

test('Displays user name and email', () => {
  const content = getPageContent();

  expect(content).toMatch(/name/i);
  expect(content).toMatch(/email/i);
});

test('Displays post titles', () => {
  const content = getPageContent();

  expect(content).toMatch(/title/i);
  expect(content).toMatch(/v-for/);
});
