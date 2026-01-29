/**
 * Nuxt External API Data Fetching
 *
 * Tests whether the agent uses useFetch/useAsyncData for external API calls
 * instead of client-side fetch patterns.
 *
 * Tricky because agents default to onMounted + fetch instead of Nuxt composables.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function getMainPageContent(): string {
  // Check pages/index.vue first, then app.vue
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  if (!pagePath) {
    throw new Error('No main page found (app/pages/index.vue, pages/index.vue, or app/app.vue)');
  }

  return readFileSync(pagePath, 'utf-8');
}

test('Main page exists', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();
});

test('Uses Nuxt data fetching composables', () => {
  const content = getMainPageContent();

  expect(content).toMatch(/useFetch|useAsyncData/);
});

test('Fetches from jsonplaceholder API', () => {
  const content = getMainPageContent();

  expect(content).toMatch(/jsonplaceholder\.typicode\.com/);
});

test('Displays title', () => {
  const content = getMainPageContent();

  // Should reference title somewhere in template or script
  expect(content).toMatch(/title/i);
});

test('Displays body content', () => {
  const content = getMainPageContent();

  // Should reference body somewhere
  expect(content).toMatch(/body/i);
});

test('Does not use onMounted + fetch anti-pattern', () => {
  const content = getMainPageContent();

  const hasAntiPattern = /onMounted[\s\S]*?fetch\(/.test(content);
  expect(hasAntiPattern).toBe(false);
});
