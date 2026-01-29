/**
 * Nuxt Error Handling
 *
 * Tests whether the agent can implement error handling using error.vue,
 * NuxtErrorBoundary, useError, clearError, and createError.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

test('error.vue exists in app directory', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'error.vue'),
    join(rootDir, 'error.vue'),
  ];

  const exists = possiblePaths.some((p) => existsSync(p));
  expect(exists).toBe(true);
});

test('error.vue uses useError', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'error.vue'),
    join(rootDir, 'error.vue'),
  ];

  const errorPath = possiblePaths.find((p) => existsSync(p));

  if (errorPath) {
    const content = readFileSync(errorPath, 'utf-8');
    expect(content).toMatch(/useError/);
  }
});

test('error.vue has clearError button', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'error.vue'),
    join(rootDir, 'error.vue'),
  ];

  const errorPath = possiblePaths.find((p) => existsSync(p));

  if (errorPath) {
    const content = readFileSync(errorPath, 'utf-8');
    expect(content).toMatch(/clearError/);
    expect(content).toMatch(/<button|UButton/i);
  }
});

test('Index page exists', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const exists = possiblePaths.some((p) => existsSync(p));
  expect(exists).toBe(true);
});

test('Index page uses NuxtErrorBoundary', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const pagePath = possiblePaths.find((p) => existsSync(p));

  if (pagePath) {
    const content = readFileSync(pagePath, 'utf-8');
    expect(content).toMatch(/NuxtErrorBoundary/);
  }
});

test('Index page has error slot', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const pagePath = possiblePaths.find((p) => existsSync(p));

  if (pagePath) {
    const content = readFileSync(pagePath, 'utf-8');
    expect(content).toMatch(/#error|v-slot:error/);
  }
});

test('Index page can trigger error with createError', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const pagePath = possiblePaths.find((p) => existsSync(p));

  if (pagePath) {
    const content = readFileSync(pagePath, 'utf-8');
    expect(content).toMatch(/createError/);
  }
});

test('Index page can clear error locally', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const pagePath = possiblePaths.find((p) => existsSync(p));

  if (pagePath) {
    const content = readFileSync(pagePath, 'utf-8');

    // Should be able to set error to null
    expect(content).toMatch(/error\s*=\s*null|clearError/);
  }
});
