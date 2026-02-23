/**
 * Nuxt Content Navigation
 *
 * Tests whether the agent uses queryCollectionNavigation to build a sidebar
 * instead of manually querying and building navigation.
 *
 * Tricky because agents often build navigation by querying all docs and
 * mapping them manually, instead of using the built-in navigation utility.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

test('Content config defines a docs collection', () => {
  const configPath = join(process.cwd(), 'content.config.ts');
  expect(existsSync(configPath)).toBe(true);

  const content = readFileSync(configPath, 'utf-8');

  expect(content).toMatch(/docs/);
  expect(content).toMatch(/defineCollection/);
  expect(content).toMatch(/type\s*:\s*['"]page['"]/);
});

test('Navigation component or layout uses queryCollectionNavigation', () => {
  const candidates = [
    join(process.cwd(), 'app', 'layouts', 'default.vue'),
    join(process.cwd(), 'app', 'layouts', 'docs.vue'),
    join(process.cwd(), 'layouts', 'default.vue'),
    join(process.cwd(), 'layouts', 'docs.vue'),
    join(process.cwd(), 'app', 'components', 'Sidebar.vue'),
    join(process.cwd(), 'app', 'components', 'Navigation.vue'),
    join(process.cwd(), 'app', 'components', 'DocsSidebar.vue'),
    join(process.cwd(), 'app', 'components', 'AppSidebar.vue'),
    join(process.cwd(), 'components', 'Sidebar.vue'),
    join(process.cwd(), 'components', 'Navigation.vue'),
    join(process.cwd(), 'app', 'pages', 'docs', '[...slug].vue'),
    join(process.cwd(), 'pages', 'docs', '[...slug].vue'),
  ];

  const allContents = candidates
    .filter(p => existsSync(p))
    .map(p => readFileSync(p, 'utf-8'))
    .join('\n');

  expect(allContents).toMatch(/queryCollectionNavigation/);
});

test('Navigation renders links from the navigation tree', () => {
  const candidates = [
    join(process.cwd(), 'app', 'layouts', 'default.vue'),
    join(process.cwd(), 'app', 'layouts', 'docs.vue'),
    join(process.cwd(), 'layouts', 'default.vue'),
    join(process.cwd(), 'layouts', 'docs.vue'),
    join(process.cwd(), 'app', 'components', 'Sidebar.vue'),
    join(process.cwd(), 'app', 'components', 'Navigation.vue'),
    join(process.cwd(), 'app', 'components', 'DocsSidebar.vue'),
    join(process.cwd(), 'app', 'components', 'AppSidebar.vue'),
    join(process.cwd(), 'components', 'Sidebar.vue'),
    join(process.cwd(), 'components', 'Navigation.vue'),
    join(process.cwd(), 'app', 'pages', 'docs', '[...slug].vue'),
    join(process.cwd(), 'pages', 'docs', '[...slug].vue'),
  ];

  const allContents = candidates
    .filter(p => existsSync(p))
    .map(p => readFileSync(p, 'utf-8'))
    .join('\n');

  expect(allContents).toMatch(/v-for/);
  expect(allContents).toMatch(/NuxtLink|nuxt-link/);
});

test('Catch-all page exists for rendering doc content', () => {
  const catchAllPage = findFile(
    join(process.cwd(), 'app', 'pages', 'docs', '[...slug].vue'),
    join(process.cwd(), 'pages', 'docs', '[...slug].vue'),
  );

  expect(catchAllPage).toBeDefined();

  const content = readFileSync(catchAllPage!, 'utf-8');

  expect(content).toMatch(/queryCollection/);
  expect(content).toMatch(/<ContentRenderer/);
});

test('Catch-all page uses route path to query content', () => {
  const catchAllPage = findFile(
    join(process.cwd(), 'app', 'pages', 'docs', '[...slug].vue'),
    join(process.cwd(), 'pages', 'docs', '[...slug].vue'),
  );

  expect(catchAllPage).toBeDefined();

  const content = readFileSync(catchAllPage!, 'utf-8');

  expect(content).toMatch(/\.path\s*\(/);
  expect(content).toMatch(/\.first\s*\(\)/);
});

