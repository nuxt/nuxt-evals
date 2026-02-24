/**
 * Nuxt Content Blog with Collection Schema
 *
 * Tests whether the agent creates a blog collection with custom schema,
 * writes markdown posts with proper frontmatter, and queries/renders them.
 *
 * Tricky because agents often forget to define schema with zod, skip
 * frontmatter fields, or use wrong query methods for listing vs single post.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

test('Content config defines a blog collection with schema', () => {
  const configPath = join(process.cwd(), 'content.config.ts');
  expect(existsSync(configPath)).toBe(true);

  const content = readFileSync(configPath, 'utf-8');

  expect(content).toMatch(/blog/);
  expect(content).toMatch(/defineCollection/);
  expect(content).toMatch(/schema/);
  expect(content).toMatch(/z\./);
});

test('Blog collection schema includes required fields', () => {
  const configPath = join(process.cwd(), 'content.config.ts');
  expect(existsSync(configPath)).toBe(true);

  const content = readFileSync(configPath, 'utf-8');

  expect(content).toMatch(/tags/);
  expect(content).toMatch(/date/);
  expect(content).toMatch(/image/);
});

test('Blog markdown posts exist with frontmatter', () => {
  const blogDir = findFile(
    join(process.cwd(), 'content', 'blog'),
    join(process.cwd(), 'content'),
  );

  expect(blogDir).toBeDefined();

  const files = readdirSync(blogDir!).filter(f => f.endsWith('.md'));
  expect(files.length).toBeGreaterThanOrEqual(2);

  const firstPost = readFileSync(join(blogDir!, files[0]), 'utf-8');
  // Frontmatter should be present (starts with ---)
  expect(firstPost).toMatch(/^---/);
  expect(firstPost).toMatch(/tags/);
  expect(firstPost).toMatch(/date/);
});

test('Blog listing page exists and queries collection', () => {
  const blogPage = findFile(
    join(process.cwd(), 'app', 'pages', 'blog', 'index.vue'),
    join(process.cwd(), 'app', 'pages', 'blog.vue'),
  );

  expect(blogPage).toBeDefined();

  const content = readFileSync(blogPage!, 'utf-8');

  expect(content).toMatch(/queryCollection/);
  expect(content).toMatch(/\.all\(\)/);
});

test('Blog listing page orders posts by date', () => {
  const blogPage = findFile(
    join(process.cwd(), 'app', 'pages', 'blog', 'index.vue'),
    join(process.cwd(), 'app', 'pages', 'blog.vue'),
  );

  expect(blogPage).toBeDefined();

  const content = readFileSync(blogPage!, 'utf-8');

  expect(content).toMatch(/order\s*\(\s*['"]date['"]\s*,\s*['"]DESC['"]\s*\)/i);
});

test('Dynamic blog post page exists with ContentRenderer', () => {
  const postPage = findFile(
    join(process.cwd(), 'app', 'pages', 'blog', '[...slug].vue'),
    join(process.cwd(), 'app', 'pages', 'blog', '[slug].vue'),
  );

  expect(postPage).toBeDefined();

  const content = readFileSync(postPage!, 'utf-8');

  expect(content).toMatch(/<ContentRenderer/);
  expect(content).toMatch(/queryCollection/);
});
