/**
 * Nuxt Error Handling
 *
 * Tests whether the agent implements both global error handling (error.vue)
 * and component-level error boundaries (NuxtErrorBoundary).
 *
 * Tricky because agents might only implement one level of error handling
 * or use incorrect error utilities.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

test('Global error page exists', () => {
  const errorPath = findFile(
    join(process.cwd(), 'app', 'error.vue'),
  );

  expect(errorPath).toBeDefined();
});

test('Error page uses useError or error prop', () => {
  const errorPath = findFile(
    join(process.cwd(), 'app', 'error.vue'),
  );

  expect(errorPath).toBeDefined();

  const content = readFileSync(errorPath!, 'utf-8');

  // Accept useError() or defineProps with error
  expect(content).toMatch(/useError|defineProps|props\.error|error\.statusCode|error\.message/);
});

test('Error page has clearError functionality', () => {
  const errorPath = findFile(
    join(process.cwd(), 'app', 'error.vue'),
  );

  expect(errorPath).toBeDefined();

  const content = readFileSync(errorPath!, 'utf-8');

  expect(content).toMatch(/clearError/);
});

test('A page or app.vue uses NuxtErrorBoundary', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();

  const content = readFileSync(pagePath!, 'utf-8');

  expect(content).toMatch(/NuxtErrorBoundary/);
});

test('NuxtErrorBoundary has error slot', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();

  const content = readFileSync(pagePath!, 'utf-8');

  if (/NuxtErrorBoundary/.test(content)) {
    expect(content).toMatch(/#error|v-slot:error|@error/);
  }
});

