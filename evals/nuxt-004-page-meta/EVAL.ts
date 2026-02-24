/**
 * Nuxt Page Meta and Layouts
 *
 * Tests whether the agent correctly uses definePageMeta for layouts and
 * useHead for dynamic page titles.
 *
 * Tricky because agents confuse page meta with head meta or place layouts
 * in wrong directories.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

test('Homepage uses useHead or definePageMeta for page title', () => {
  const indexPath = join(process.cwd(), 'app', 'pages', 'index.vue');
  expect(existsSync(indexPath)).toBe(true);

  const content = readFileSync(indexPath, 'utf-8');
  expect(content).toMatch(/useHead|useSeoMeta|definePageMeta/);
});

test('About page exists with custom layout assigned via definePageMeta', () => {
  const aboutPath = findFile(
    join(process.cwd(), 'app', 'pages', 'about.vue'),
    join(process.cwd(), 'app', 'pages', 'about', 'index.vue'),
  );

  expect(aboutPath).toBeDefined();

  const content = readFileSync(aboutPath!, 'utf-8');
  expect(content).toMatch(/definePageMeta/);
  expect(content).toMatch(/layout\s*:\s*['"]\w+['"]/);
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

  const content = readFileSync(join(layoutsDir, layoutFile!), 'utf-8');
  expect(content).toMatch(/<slot/);
});

test('Dynamic blog page exists', () => {
  const blogSlugPath = findFile(
    join(process.cwd(), 'app', 'pages', 'blog', '[slug].vue'),
  );

  expect(blogSlugPath).toBeDefined();
});

test('Blog page uses useHead for dynamic title', () => {
  const blogSlugPath = findFile(
    join(process.cwd(), 'app', 'pages', 'blog', '[slug].vue'),
  );

  expect(blogSlugPath).toBeDefined();

  const content = readFileSync(blogSlugPath!, 'utf-8');

  expect(content).toMatch(/useHead/);
  expect(content).toMatch(/useRoute|route|slug/);
});

test('app.vue uses NuxtLayout for layout support', () => {
  const appPath = join(process.cwd(), 'app', 'app.vue');
  const content = readFileSync(appPath, 'utf-8');

  expect(content).toMatch(/<NuxtLayout/);
});
