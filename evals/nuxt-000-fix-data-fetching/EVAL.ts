/**
 * Fix Data Fetching Anti-Pattern
 *
 * Tests whether the agent replaces the onMounted + $fetch + manual ref
 * pattern with Nuxt's built-in data fetching composables (useFetch/useAsyncData).
 *
 * Tricky because agents are comfortable with the Vue pattern of fetching
 * in onMounted, but this breaks SSR and causes hydration mismatches in Nuxt.
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

test('Page uses Nuxt data fetching composable', () => {
  const content = getPageContent();

  expect(content).toMatch(/useFetch|useAsyncData/);
});

test('Page does not use onMounted for data fetching', () => {
  const content = getPageContent();

  expect(content).not.toMatch(/onMounted/);
});

test('Page does not use manual ref for loading state', () => {
  const content = getPageContent();

  const hasManualLoading = /(?:const|let)\s+(?:is)?loading\s*=\s*ref\s*\(/i.test(content);
  expect(hasManualLoading).toBe(false);
});

test('Page does not use manual ref for data', () => {
  const content = getPageContent();

  const hasManualData = /(?:const|let)\s+data\s*=\s*ref\s*\(/i.test(content);
  expect(hasManualData).toBe(false);
});

test('Page still fetches from the greeting API', () => {
  const content = getPageContent();

  expect(content).toMatch(/\/api\/greeting/);
});

test('Page displays the greeting message', () => {
  const content = getPageContent();

  expect(content).toMatch(/<template>[\s\S]*message[\s\S]*<\/template>/);
});

test('Server API route is unchanged', () => {
  const apiPath = join(process.cwd(), 'server', 'api', 'greeting.ts');
  expect(existsSync(apiPath)).toBe(true);

  const content = readFileSync(apiPath, 'utf-8');
  expect(content).toMatch(/defineEventHandler/);
  expect(content).toMatch(/Hello from the API/);
});
