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
    join(process.cwd(), 'error.vue'),
  );

  expect(errorPath).toBeDefined();
});

test('Error page uses useError or error prop', () => {
  const errorPath = findFile(
    join(process.cwd(), 'app', 'error.vue'),
    join(process.cwd(), 'error.vue'),
  );

  const content = readFileSync(errorPath!, 'utf-8');

  // Accept useError() or props.error
  expect(content).toMatch(/useError|error/);
});

test('Error page has clearError functionality', () => {
  const errorPath = findFile(
    join(process.cwd(), 'app', 'error.vue'),
    join(process.cwd(), 'error.vue'),
  );

  const content = readFileSync(errorPath!, 'utf-8');

  expect(content).toMatch(/clearError/);
});

test('Index page exists', () => {
  const indexPath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
  );

  expect(indexPath).toBeDefined();
});

test('Index page uses NuxtErrorBoundary', () => {
  const indexPath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
  );

  const content = readFileSync(indexPath!, 'utf-8');

  expect(content).toMatch(/NuxtErrorBoundary/);
});

test('Index page has error slot', () => {
  const indexPath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
  );

  const content = readFileSync(indexPath!, 'utf-8');

  expect(content).toMatch(/#error|v-slot:error|@error/);
});

test('Index page can trigger error', () => {
  const indexPath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
  );

  const content = readFileSync(indexPath!, 'utf-8');

  expect(content).toMatch(/createError|throw|Error/);
});
