/**
 * Nuxt Data Fetching with External API
 *
 * Tests whether the agent can fetch data from an external API using useFetch
 * and display it properly in the template.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

test('Index page exists', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const exists = possiblePaths.some((p) => existsSync(p));
  expect(exists).toBe(true);
});

test('Uses useFetch to fetch data', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const pagePath = possiblePaths.find((p) => existsSync(p));

  if (pagePath) {
    const content = readFileSync(pagePath, 'utf-8');
    expect(content).toMatch(/useFetch/);
  }
});

test('Fetches from jsonplaceholder API', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const pagePath = possiblePaths.find((p) => existsSync(p));

  if (pagePath) {
    const content = readFileSync(pagePath, 'utf-8');
    expect(content).toMatch(/jsonplaceholder\.typicode\.com\/posts\/1/);
  }
});

test('Displays title in h1', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const pagePath = possiblePaths.find((p) => existsSync(p));

  if (pagePath) {
    const content = readFileSync(pagePath, 'utf-8');

    // Should have h1 element
    expect(content).toMatch(/<h1/);

    // Should reference title in template
    expect(content).toMatch(/title|data\.title/);
  }
});

test('Displays body in paragraph', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const pagePath = possiblePaths.find((p) => existsSync(p));

  if (pagePath) {
    const content = readFileSync(pagePath, 'utf-8');

    // Should have p element
    expect(content).toMatch(/<p/);

    // Should reference body in template
    expect(content).toMatch(/body|data\.body/);
  }
});

test('Does not use raw fetch in onMounted', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const pagePath = possiblePaths.find((p) => existsSync(p));

  if (pagePath) {
    const content = readFileSync(pagePath, 'utf-8');

    // Should NOT use onMounted with fetch (anti-pattern)
    const hasAntiPattern = /onMounted\s*\(\s*(?:async\s*)?\(\s*\)\s*=>\s*\{[\s\S]*?fetch\(/.test(content);
    expect(hasAntiPattern).toBe(false);
  }
});
