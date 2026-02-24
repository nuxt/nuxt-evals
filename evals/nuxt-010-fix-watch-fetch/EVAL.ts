/**
 * Fix Watch + $fetch Anti-Pattern
 *
 * Tests whether the agent replaces the manual watch() + $fetch() + onMounted()
 * pattern with useFetch using a computed/reactive URL.
 *
 * Tricky because the watch + $fetch pattern works functionally but causes
 * flicker on SSR (client-only fetch), shows stale data during navigation,
 * and duplicates loading/error state that useFetch handles automatically.
 * The agent must recognize that useFetch with a reactive URL is the
 * idiomatic Nuxt pattern.
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

test('Uses useFetch or useAsyncData', () => {
  const content = getPageContent();

  expect(content).toMatch(/useFetch|useAsyncData/);
});

test('Uses computed URL or reactive pattern for refetching', () => {
  const content = getPageContent();

  // Should use one of these Nuxt reactive patterns:
  // 1. Computed getter as URL: useFetch(() => `/api/users/${id.value}`)
  // 2. Computed ref: const url = computed(() => ...); useFetch(url)
  // 3. Watch option: useFetch(url, { watch: [...] })
  // 4. useAsyncData with $fetch getter
  // Note: regex accounts for optional TypeScript generics like useFetch<User>(...)
  const hasComputedUrl = /useFetch\s*(?:<[^>]*>)?\s*\(\s*\(\)\s*=>/.test(content);
  const hasComputedRef = /computed\s*\(/.test(content) && /useFetch/.test(content);
  const hasWatchOption = /watch\s*:\s*\[/.test(content);
  const hasUseAsyncDataGetter = /useAsyncData\s*(?:<[^>]*>)?\s*\(/.test(content) && /\$fetch/.test(content);

  expect(hasComputedUrl || hasComputedRef || hasWatchOption || hasUseAsyncDataGetter).toBe(true);
});

test('Does not use manual watch + fetch', () => {
  const content = getPageContent();

  expect(content).not.toMatch(/watch\s*\([\s\S]*?\$?fetch\s*\(/);
});

test('Does not use onMounted', () => {
  const content = getPageContent();

  expect(content).not.toMatch(/onMounted/);
});

test('Does not use manual loading ref', () => {
  const content = getPageContent();

  expect(content).not.toMatch(/(?:const|let)\s+loading\s*=\s*ref\s*\(/);
});

test('Does not use manual error ref', () => {
  const content = getPageContent();

  expect(content).not.toMatch(/(?:const|let)\s+error\s*=\s*ref\s*\(/);
});

test('Still fetches from the users API', () => {
  const content = getPageContent();

  expect(content).toMatch(/\/api\/users/);
});

test('Still has user ID input', () => {
  const content = getPageContent();

  expect(content).toMatch(/v-model/);
  expect(content).toMatch(/<input|<UInput/);
});

test('Still displays user name and email', () => {
  const content = getPageContent();

  expect(content).toMatch(/name/i);
  expect(content).toMatch(/email/i);
});

test('Server API route is unchanged', () => {
  const apiPath = join(process.cwd(), 'server', 'api', 'users', '[id].ts');
  expect(existsSync(apiPath)).toBe(true);

  const content = readFileSync(apiPath, 'utf-8');
  expect(content).toMatch(/defineEventHandler/);
});
