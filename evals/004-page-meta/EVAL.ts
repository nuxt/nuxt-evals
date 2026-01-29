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

test('Homepage exists with title', () => {
  const indexPath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
  );

  expect(indexPath).toBeDefined();

  const content = readFileSync(indexPath!, 'utf-8');
  expect(content).toMatch(/Welcome Home/i);
});

test('About page exists with custom layout', () => {
  const aboutPath = findFile(
    join(process.cwd(), 'app', 'pages', 'about.vue'),
    join(process.cwd(), 'app', 'pages', 'about', 'index.vue'),
    join(process.cwd(), 'pages', 'about.vue'),
    join(process.cwd(), 'pages', 'about', 'index.vue'),
  );

  expect(aboutPath).toBeDefined();

  const content = readFileSync(aboutPath!, 'utf-8');
  expect(content).toMatch(/definePageMeta/);
  expect(content).toMatch(/layout/);
});

test('Custom layout exists in layouts directory', () => {
  const layoutsDir = findFile(
    join(process.cwd(), 'app', 'layouts'),
    join(process.cwd(), 'layouts'),
  );

  expect(layoutsDir).toBeDefined();

  const files = readdirSync(layoutsDir!);
  expect(files.length).toBeGreaterThan(0);
});

test('Layout has slot for content', () => {
  const layoutsDir = findFile(
    join(process.cwd(), 'app', 'layouts'),
    join(process.cwd(), 'layouts'),
  );

  const files = readdirSync(layoutsDir!);
  const layoutFile = files.find(f => f.endsWith('.vue'));

  const content = readFileSync(join(layoutsDir!, layoutFile!), 'utf-8');
  expect(content).toMatch(/<slot/);
});

test('Dynamic blog page exists', () => {
  const blogSlugPath = findFile(
    join(process.cwd(), 'app', 'pages', 'blog', '[slug].vue'),
    join(process.cwd(), 'pages', 'blog', '[slug].vue'),
  );

  expect(blogSlugPath).toBeDefined();
});

test('Blog page uses useHead for dynamic title', () => {
  const blogSlugPath = findFile(
    join(process.cwd(), 'app', 'pages', 'blog', '[slug].vue'),
    join(process.cwd(), 'pages', 'blog', '[slug].vue'),
  );

  const content = readFileSync(blogSlugPath!, 'utf-8');

  expect(content).toMatch(/useHead/);
  expect(content).toMatch(/useRoute|route|slug/);
});
