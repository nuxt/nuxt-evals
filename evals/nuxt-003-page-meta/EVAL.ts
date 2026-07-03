/**
 * Nuxt Page Meta and Layouts
 *
 * Tests whether the agent correctly uses definePageMeta for layouts and
 * useHead for dynamic page titles — with the actual title values asserted,
 * not just the API names.
 *
 * Tricky because agents confuse page meta with head meta or place layouts
 * in wrong directories. All content checks run on comment-stripped source so
 * the starter's TODO comments (which name the expected APIs) score nothing.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function readStripped(path: string): string {
  return stripComments(readFileSync(path, 'utf-8'));
}

test('Homepage sets the "Welcome Home" title via a head/meta API', () => {
  const indexPath = join(process.cwd(), 'app', 'pages', 'index.vue');
  expect(existsSync(indexPath)).toBe(true);

  const content = readStripped(indexPath);
  expect(content).toMatch(/useHead|useSeoMeta|definePageMeta/);
  expect(content).toMatch(/title\s*:\s*['"`]Welcome Home['"`]/);
});

test('About page assigns a custom layout via definePageMeta', () => {
  const aboutPath = findFile(
    join(process.cwd(), 'app', 'pages', 'about.vue'),
    join(process.cwd(), 'app', 'pages', 'about', 'index.vue'),
  );

  expect(aboutPath).toBeDefined();

  const content = readStripped(aboutPath!);
  expect(content).toMatch(/definePageMeta/);
  expect(content).toMatch(/layout\s*:\s*['"]\w+['"]/);
});

test('About page sets the "About Us" title', () => {
  const aboutPath = findFile(
    join(process.cwd(), 'app', 'pages', 'about.vue'),
    join(process.cwd(), 'app', 'pages', 'about', 'index.vue'),
  );

  expect(aboutPath).toBeDefined();

  const content = readStripped(aboutPath!);
  expect(content).toMatch(/title\s*:\s*['"`]About Us['"`]/);
});

test('Custom layout exists in layouts directory', () => {
  const layoutsDir = join(process.cwd(), 'app', 'layouts');

  expect(existsSync(layoutsDir)).toBe(true);

  const files = readdirSync(layoutsDir);
  expect(files.length).toBeGreaterThan(0);
});

test('Layout has slot for content', () => {
  const layoutsDir = join(process.cwd(), 'app', 'layouts');

  expect(existsSync(layoutsDir)).toBe(true);

  const files = readdirSync(layoutsDir);
  const layoutFile = files.find(f => f.endsWith('.vue'));

  expect(layoutFile).toBeDefined();

  const content = readStripped(join(layoutsDir, layoutFile!));
  expect(content).toMatch(/<slot/);
});

test('Dynamic blog page exists', () => {
  const blogSlugPath = findFile(
    join(process.cwd(), 'app', 'pages', 'blog', '[slug].vue'),
  );

  expect(blogSlugPath).toBeDefined();
});

test('Blog page derives its title from the slug via useHead', () => {
  const blogSlugPath = findFile(
    join(process.cwd(), 'app', 'pages', 'blog', '[slug].vue'),
  );

  expect(blogSlugPath).toBeDefined();

  const content = readStripped(blogSlugPath!);

  expect(content).toMatch(/useHead|useSeoMeta/);

  // The title must actually be dynamic: either the title expression
  // references the slug (template literal / concatenation / function), or
  // the title comes from a computed that references it.
  const titleUsesSlug = /title\s*:[^\n]{0,160}slug/.test(content);
  const computedTitle =
    /computed\s*\([\s\S]{0,160}?slug/.test(content) &&
    /title\s*:/.test(content);
  expect(titleUsesSlug || computedTitle).toBe(true);
});

test('app.vue uses NuxtLayout for layout support', () => {
  const appPath = join(process.cwd(), 'app', 'app.vue');
  const content = readStripped(appPath);

  expect(content).toMatch(/<NuxtLayout/);
});
