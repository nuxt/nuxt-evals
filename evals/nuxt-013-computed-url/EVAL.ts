/**
 * Nuxt Computed URL / Reactive Data Fetching
 *
 * Tests whether the agent uses computed URLs or the watch option with
 * useFetch/useAsyncData for reactive data fetching.
 *
 * Tricky because agents often manually call $fetch inside a watcher or
 * create a custom watch + fetch pattern instead of using Nuxt's built-in
 * reactive URL support (computed getter or watch option).
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function getPageContent(): string {
  const candidates = [
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'pages', 'search.vue'),
    join(process.cwd(), 'app', 'pages', 'user-search.vue'),
    join(process.cwd(), 'app', 'pages', 'users.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      const content = readFileSync(candidate, 'utf-8');
      if (content.includes('jsonplaceholder')) return content;
    }
  }

  const pagePath = findFile(...candidates);
  if (!pagePath) {
    throw new Error('No page found');
  }

  return readFileSync(pagePath, 'utf-8');
}

test('Page exists', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'pages', 'search.vue'),
    join(process.cwd(), 'app', 'pages', 'user-search.vue'),
    join(process.cwd(), 'app', 'pages', 'users.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();
});

test('Uses Nuxt data fetching composable', () => {
  const content = getPageContent();

  expect(content).toMatch(/useFetch|useAsyncData|useLazyFetch|useLazyAsyncData/);
});

test('Fetches from jsonplaceholder users API', () => {
  const content = getPageContent();

  expect(content).toMatch(/jsonplaceholder\.typicode\.com\/users/);
});

test('Has reactive ID input', () => {
  const content = getPageContent();

  // Should have a ref for the user ID and an input
  expect(content).toMatch(/ref\(|v-model/);
});

test('Uses computed URL or watch option for reactive refetching', () => {
  const content = getPageContent();

  // Should use one of these Nuxt reactive patterns:
  // 1. Computed getter as URL: useFetch(() => `...`)
  // 2. Computed ref as URL: useFetch(url) where url = computed(...)
  // 3. Watch option: useFetch(url, { watch: [id] })
  // 4. Query option: useFetch(url, { query: { id } })
  // Should NOT use manual watch(() => id.value, async () => { $fetch(...) })
  const hasComputedUrl = /useFetch\s*\(\s*\(\)/.test(content);
  const hasComputedRef = /computed\s*\(/.test(content) && /useFetch/.test(content);
  const hasWatchOption = /watch\s*:\s*\[/.test(content);
  const hasQueryOption = /query\s*:\s*\{/.test(content);

  expect(hasComputedUrl || hasComputedRef || hasWatchOption || hasQueryOption).toBe(true);
});

test('Does not use manual watch + $fetch anti-pattern', () => {
  const content = getPageContent();

  // Should NOT manually watch + $fetch
  const hasManualWatch = /watch\s*\(\s*\(\)\s*=>\s*[\w.]+\s*,\s*async\s*\(\)\s*=>\s*\{[\s\S]*?\$fetch/.test(content);
  expect(hasManualWatch).toBe(false);
});

test('Displays user name and email', () => {
  const content = getPageContent();

  expect(content).toMatch(/name/i);
  expect(content).toMatch(/email/i);
});

test('Has input for user ID', () => {
  const content = getPageContent();

  // Should have an input element for typing the user ID
  expect(content).toMatch(/<input|<UInput|v-model/);
});
