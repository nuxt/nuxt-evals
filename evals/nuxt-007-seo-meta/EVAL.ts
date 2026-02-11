/**
 * Nuxt SEO Meta
 *
 * Tests whether the agent uses useSeoMeta for SEO tags instead of
 * manually constructing meta arrays with useHead.
 *
 * Tricky because agents often use useHead with verbose meta arrays
 * instead of the simpler and more type-safe useSeoMeta composable.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

test('Homepage exists', () => {
  const indexPath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
  );

  expect(indexPath).toBeDefined();
});

test('Homepage uses useSeoMeta for SEO tags', () => {
  const indexPath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
  );

  const content = readFileSync(indexPath!, 'utf-8');

  // Should use useSeoMeta (preferred) over useHead with meta arrays
  expect(content).toMatch(/useSeoMeta/);
});

test('Homepage sets title and description', () => {
  const indexPath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
  );

  const content = readFileSync(indexPath!, 'utf-8');

  expect(content).toMatch(/title/);
  expect(content).toMatch(/description/);
});

test('Homepage sets Open Graph tags', () => {
  const indexPath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
  );

  const content = readFileSync(indexPath!, 'utf-8');

  // Should have OG tags via useSeoMeta (ogTitle, ogDescription, etc.)
  expect(content).toMatch(/og[A-Z]|ogTitle|ogDescription|ogImage/);
});

test('Dynamic blog page exists', () => {
  const blogPath = findFile(
    join(process.cwd(), 'app', 'pages', 'blog', '[slug].vue'),
    join(process.cwd(), 'pages', 'blog', '[slug].vue'),
    join(process.cwd(), 'app', 'pages', 'blog', '[...slug].vue'),
    join(process.cwd(), 'pages', 'blog', '[...slug].vue'),
  );

  expect(blogPath).toBeDefined();
});

test('Blog page uses useSeoMeta with dynamic values', () => {
  const blogPath = findFile(
    join(process.cwd(), 'app', 'pages', 'blog', '[slug].vue'),
    join(process.cwd(), 'pages', 'blog', '[slug].vue'),
    join(process.cwd(), 'app', 'pages', 'blog', '[...slug].vue'),
    join(process.cwd(), 'pages', 'blog', '[...slug].vue'),
  );

  const content = readFileSync(blogPath!, 'utf-8');

  // Should use useSeoMeta with dynamic values based on route params
  expect(content).toMatch(/useSeoMeta/);
  expect(content).toMatch(/useRoute|route|slug/);
});
