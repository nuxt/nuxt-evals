/**
 * Nuxt Routing with NuxtLink
 *
 * Tests whether the agent uses NuxtLink for client-side navigation instead of
 * regular anchor tags. Also tests proper page creation in the pages directory.
 *
 * Tricky because agents often use <a href=""> instead of <NuxtLink to="">.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

test('About page exists', () => {
  const aboutPath = findFile(
    join(process.cwd(), 'app', 'pages', 'about.vue'),
    join(process.cwd(), 'app', 'pages', 'about', 'index.vue'),
    join(process.cwd(), 'pages', 'about.vue'),
    join(process.cwd(), 'pages', 'about', 'index.vue'),
  );

  expect(aboutPath).toBeDefined();
});

test('About page displays content', () => {
  const aboutPath = findFile(
    join(process.cwd(), 'app', 'pages', 'about.vue'),
    join(process.cwd(), 'app', 'pages', 'about', 'index.vue'),
    join(process.cwd(), 'pages', 'about.vue'),
    join(process.cwd(), 'pages', 'about', 'index.vue'),
  );

  expect(aboutPath).toBeDefined();

  const content = readFileSync(aboutPath!, 'utf-8');

  expect(content).toMatch(/<template>/);
  expect(content).toMatch(/[Aa]bout/);
});

test('Homepage uses NuxtLink for navigation', () => {
  const homePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(homePath).toBeDefined();

  const content = readFileSync(homePath!, 'utf-8');

  // Should use NuxtLink, not <a>
  expect(content).toMatch(/<NuxtLink/);
  expect(content).toMatch(/to=["']\/about["']/);
});

test('About page uses NuxtLink to navigate home', () => {
  const aboutPath = findFile(
    join(process.cwd(), 'app', 'pages', 'about.vue'),
    join(process.cwd(), 'app', 'pages', 'about', 'index.vue'),
    join(process.cwd(), 'pages', 'about.vue'),
    join(process.cwd(), 'pages', 'about', 'index.vue'),
  );

  expect(aboutPath).toBeDefined();

  const content = readFileSync(aboutPath!, 'utf-8');

  expect(content).toMatch(/<NuxtLink/);
  expect(content).toMatch(/to=["']\/["']/);
});

test('Does not use anchor tags for internal navigation', () => {
  const homePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  const aboutPath = findFile(
    join(process.cwd(), 'app', 'pages', 'about.vue'),
    join(process.cwd(), 'app', 'pages', 'about', 'index.vue'),
    join(process.cwd(), 'pages', 'about.vue'),
    join(process.cwd(), 'pages', 'about', 'index.vue'),
  );

  expect(homePath).toBeDefined();

  const homeContent = readFileSync(homePath!, 'utf-8');

  // Should NOT use <a href="/..."> for internal links
  expect(homeContent).not.toMatch(/<a[^>]*href=["']\/about["']/);

  if (aboutPath) {
    const aboutContent = readFileSync(aboutPath, 'utf-8');
    expect(aboutContent).not.toMatch(/<a[^>]*href=["']\/["']/);
  }
});
