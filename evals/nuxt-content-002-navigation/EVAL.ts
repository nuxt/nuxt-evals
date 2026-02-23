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
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function getAllVueContents(): string {
  const dirs = [
    join(process.cwd(), 'app', 'layouts'),
    join(process.cwd(), 'layouts'),
    join(process.cwd(), 'app', 'components'),
    join(process.cwd(), 'components'),
  ];

  const files: string[] = [];

  for (const dir of dirs) {
    if (existsSync(dir)) {
      for (const f of readdirSync(dir)) {
        if (f.endsWith('.vue')) files.push(join(dir, f));
      }
    }
  }

  const catchAll = findCatchAllPage();
  if (catchAll) files.push(catchAll);

  return files.map(p => readFileSync(p, 'utf-8')).join('\n');
}

function findCatchAllPage(): string | undefined {
  return findFile(
    join(process.cwd(), 'app', 'pages', 'docs', '[...slug].vue'),
    join(process.cwd(), 'app', 'pages', 'docs', '[[...slug]].vue'),
    join(process.cwd(), 'app', 'pages', 'docs', '[slug].vue'),
    join(process.cwd(), 'pages', 'docs', '[...slug].vue'),
    join(process.cwd(), 'pages', 'docs', '[[...slug]].vue'),
    join(process.cwd(), 'pages', 'docs', '[slug].vue'),
    join(process.cwd(), 'app', 'pages', '[...slug].vue'),
    join(process.cwd(), 'app', 'pages', '[[...slug]].vue'),
    join(process.cwd(), 'pages', '[...slug].vue'),
    join(process.cwd(), 'pages', '[[...slug]].vue'),
  );
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
  const allContents = getAllVueContents();

  expect(allContents).toMatch(/queryCollectionNavigation/);
});

test('Navigation renders links from the navigation tree', () => {
  const allContents = getAllVueContents();

  expect(allContents).toMatch(/v-for/);
  expect(allContents).toMatch(/NuxtLink|nuxt-link/);
});

test('Catch-all page exists for rendering doc content', () => {
  const catchAllPage = findCatchAllPage();

  expect(catchAllPage).toBeDefined();

  const content = readFileSync(catchAllPage!, 'utf-8');

  expect(content).toMatch(/queryCollection/);
  expect(content).toMatch(/<ContentRenderer/);
});

test('Catch-all page uses route path to query content', () => {
  const catchAllPage = findCatchAllPage();

  expect(catchAllPage).toBeDefined();

  const content = readFileSync(catchAllPage!, 'utf-8');

  expect(content).toMatch(/\.path\s*\(/);
  expect(content).toMatch(/\.first\s*\(\)/);
});

