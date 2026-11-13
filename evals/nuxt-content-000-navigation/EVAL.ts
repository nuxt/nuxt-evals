/**
 * Nuxt Content Navigation
 *
 * Tests whether the agent uses queryCollectionNavigation to build a sidebar
 * instead of manually querying and building navigation, and renders pages
 * through a catch-all route. Verified on @nuxt/content 3.16 / nuxt 4.6.4.
 *
 * Tricky because agents often build navigation by querying all docs and
 * mapping them manually, instead of using the built-in navigation utility.
 *
 * Checks and why:
 * - content.config.ts defines a `docs` collection with type 'page' (the
 *   navigation utility only works on page collections).
 * - The layout or its components (not the catch-all page) call
 *   queryCollectionNavigation.
 * - The navigation renders NuxtLinks in a v-for and walks `.children`. The
 *   tree for these docs is nested (Docs > Getting Started > Installation), so
 *   rendering only the top level shows a single "Docs" link.
 * - A [...slug] / [[...slug]] page queries the collection by the route path,
 *   with `.path(route.path)` or `.where('path', '=', route.path)`, calls
 *   `.first()` and renders the result with <ContentRenderer>.
 *
 * Comments are stripped before matching, so a hardcoded link list with a
 * comment mentioning queryCollectionNavigation does not pass.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function stripComments(source: string): string {
  // Block and line comments only count when they start a line or follow
  // whitespace, so glob strings ('docs/**') and URLs survive.
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|\s)\/\*[\s\S]*?\*\//g, '$1')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function readStripped(path: string): string {
  return stripComments(readFileSync(path, 'utf-8'));
}

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function scanVueFiles(dir: string): string[] {
  const results: string[] = [];

  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanVueFiles(fullPath));
    } else if (entry.name.endsWith('.vue')) {
      results.push(fullPath);
    }
  }

  return results;
}

function getNavigationContents(): string {
  // Only the layout and its components count: the prompt puts the sidebar in
  // a layout, not in the catch-all page.
  const dirs = [
    join(process.cwd(), 'app', 'layouts'),
    join(process.cwd(), 'app', 'components'),
  ];

  const files: string[] = [];

  for (const dir of dirs) {
    files.push(...scanVueFiles(dir));
  }

  return files.map(p => readStripped(p)).join('\n');
}

function findCatchAllPage(): string | undefined {
  return findFile(
    join(process.cwd(), 'app', 'pages', 'docs', '[...slug].vue'),
    join(process.cwd(), 'app', 'pages', 'docs', '[[...slug]].vue'),
    join(process.cwd(), 'app', 'pages', '[...slug].vue'),
    join(process.cwd(), 'app', 'pages', '[[...slug]].vue'),
  );
}

test('Content config defines a docs collection', () => {
  const configPath = join(process.cwd(), 'content.config.ts');
  expect(existsSync(configPath)).toBe(true);

  const content = readStripped(configPath);

  expect(content).toMatch(/docs/);
  expect(content).toMatch(/defineCollection/);
  expect(content).toMatch(/type\s*:\s*['"]page['"]/);
});

test('Navigation component or layout uses queryCollectionNavigation', () => {
  const allContents = getNavigationContents();

  expect(allContents).toMatch(/queryCollectionNavigation/);
});

test('Navigation renders links from the navigation tree', () => {
  const allContents = getNavigationContents();

  expect(allContents).toMatch(/v-for/);
  expect(allContents).toMatch(/NuxtLink|nuxt-link/);
  // The navigation tree is nested, so children must be rendered too
  expect(allContents).toMatch(/\.children\b|\[['"]children['"]\]/);
});

test('Catch-all page exists for rendering doc content', () => {
  const catchAllPage = findCatchAllPage();

  expect(catchAllPage).toBeDefined();

  const content = readStripped(catchAllPage!);

  expect(content).toMatch(/queryCollection/);
  expect(content).toMatch(/<ContentRenderer/);
});

test('Catch-all page uses route path to query content', () => {
  const catchAllPage = findCatchAllPage();

  expect(catchAllPage).toBeDefined();

  const content = readStripped(catchAllPage!);

  expect(content).toMatch(/\.path\s*\(|\.where\s*\(\s*['"]path['"]/);
  expect(content).toMatch(/\.first\s*\(\)/);
});

