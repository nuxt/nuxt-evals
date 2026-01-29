/**
 * Nuxt Page Meta and Layouts
 *
 * Tests whether the agent can use definePageMeta, useHead, and custom layouts.
 * Agents often confuse page meta with head meta or place layouts in wrong directories.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

test('Homepage exists with correct title', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const homePath = possiblePaths.find((p) => existsSync(p));
  expect(homePath).toBeDefined();

  if (homePath) {
    const content = readFileSync(homePath, 'utf-8');
    expect(content).toMatch(/Welcome Home/i);
  }
});

test('About page exists with special layout', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'about.vue'),
    join(rootDir, 'app', 'pages', 'about', 'index.vue'),
    join(rootDir, 'pages', 'about.vue'),
    join(rootDir, 'pages', 'about', 'index.vue'),
  ];

  const aboutPath = possiblePaths.find((p) => existsSync(p));
  expect(aboutPath).toBeDefined();

  if (aboutPath) {
    const content = readFileSync(aboutPath, 'utf-8');

    // Should have About Us title
    expect(content).toMatch(/About Us/i);

    // Should use definePageMeta with special layout
    expect(content).toMatch(/definePageMeta/);
    expect(content).toMatch(/layout.*special|layout:\s*['"]special['"]/);
  }
});

test('Special layout exists', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'layouts', 'special.vue'),
    join(rootDir, 'layouts', 'special.vue'),
  ];

  const exists = possiblePaths.some((p) => existsSync(p));
  expect(exists).toBe(true);
});

test('Special layout has slot for content', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'layouts', 'special.vue'),
    join(rootDir, 'layouts', 'special.vue'),
  ];

  const layoutPath = possiblePaths.find((p) => existsSync(p));

  if (layoutPath) {
    const content = readFileSync(layoutPath, 'utf-8');
    expect(content).toMatch(/<slot/);
  }
});

test('Blog slug page exists with dynamic title', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'blog', '[slug].vue'),
    join(rootDir, 'pages', 'blog', '[slug].vue'),
  ];

  const blogPath = possiblePaths.find((p) => existsSync(p));
  expect(blogPath).toBeDefined();

  if (blogPath) {
    const content = readFileSync(blogPath, 'utf-8');

    // Should use useHead for dynamic title
    expect(content).toMatch(/useHead/);

    // Should reference slug in title
    expect(content).toMatch(/Blog/i);
  }
});

test('Blog page uses route params for slug', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'blog', '[slug].vue'),
    join(rootDir, 'pages', 'blog', '[slug].vue'),
  ];

  const blogPath = possiblePaths.find((p) => existsSync(p));

  if (blogPath) {
    const content = readFileSync(blogPath, 'utf-8');

    // Should use useRoute or route.params for slug
    expect(content).toMatch(/useRoute|route\.params|params\.slug/);
  }
});
