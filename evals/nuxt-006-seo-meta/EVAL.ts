/**
 * Nuxt SEO Meta
 *
 * Tests whether the agent uses useSeoMeta or useHead for SEO tags
 * with proper title, description, and Open Graph configuration.
 *
 * Tricky because agents sometimes skip OG tags or don't use dynamic
 * meta values based on route params for the blog page.
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

test('Homepage uses useSeoMeta or useHead for SEO tags', () => {
  const indexPath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
  );

  const content = readFileSync(indexPath!, 'utf-8');

  // Should use useSeoMeta (preferred) or useHead for SEO
  expect(content).toMatch(/useSeoMeta|useHead/);
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

test('Blog page uses useSeoMeta or useHead with dynamic values', () => {
  const blogPath = findFile(
    join(process.cwd(), 'app', 'pages', 'blog', '[slug].vue'),
    join(process.cwd(), 'pages', 'blog', '[slug].vue'),
    join(process.cwd(), 'app', 'pages', 'blog', '[...slug].vue'),
    join(process.cwd(), 'pages', 'blog', '[...slug].vue'),
  );

  const content = readFileSync(blogPath!, 'utf-8');

  // Should use useSeoMeta or useHead with dynamic values based on route params
  expect(content).toMatch(/useSeoMeta|useHead/);
  expect(content).toMatch(/useRoute|route|slug/);
});
