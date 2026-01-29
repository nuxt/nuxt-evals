/**
 * Nuxt Routing with NuxtLink
 *
 * Tests whether the agent can implement client-side navigation using NuxtLink.
 * Agents often use regular <a> tags instead of NuxtLink or try to import it.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

test('About page exists', () => {
  const rootDir = process.cwd();

  // Check for about page in various locations
  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'about.vue'),
    join(rootDir, 'app', 'pages', 'about', 'index.vue'),
    join(rootDir, 'pages', 'about.vue'),
    join(rootDir, 'pages', 'about', 'index.vue'),
  ];

  const aboutPageExists = possiblePaths.some((p) => existsSync(p));
  expect(aboutPageExists).toBe(true);
});

test('About page displays correct content', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'about.vue'),
    join(rootDir, 'app', 'pages', 'about', 'index.vue'),
    join(rootDir, 'pages', 'about.vue'),
    join(rootDir, 'pages', 'about', 'index.vue'),
  ];

  const aboutPagePath = possiblePaths.find((p) => existsSync(p));

  if (aboutPagePath) {
    const content = readFileSync(aboutPagePath, 'utf-8');
    expect(content).toMatch(/About Page/i);
  }
});

test('Homepage has NuxtLink to about page', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'app.vue'),
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const homePath = possiblePaths.find((p) => existsSync(p));

  if (homePath) {
    const content = readFileSync(homePath, 'utf-8');

    // Should use NuxtLink component
    expect(content).toMatch(/NuxtLink/);

    // Should link to /about
    expect(content).toMatch(/to=["']\/about["']/);

    // Should have "About" text
    expect(content).toMatch(/About/);
  }
});

test('About page has NuxtLink back to home', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'about.vue'),
    join(rootDir, 'app', 'pages', 'about', 'index.vue'),
    join(rootDir, 'pages', 'about.vue'),
    join(rootDir, 'pages', 'about', 'index.vue'),
  ];

  const aboutPagePath = possiblePaths.find((p) => existsSync(p));

  if (aboutPagePath) {
    const content = readFileSync(aboutPagePath, 'utf-8');

    // Should use NuxtLink
    expect(content).toMatch(/NuxtLink/);

    // Should link to home
    expect(content).toMatch(/to=["']\/["']/);

    // Should have "Home" text
    expect(content).toMatch(/Home/);
  }
});

test('Does not use regular anchor tags for navigation', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'app.vue'),
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'app', 'pages', 'about.vue'),
    join(rootDir, 'app', 'pages', 'about', 'index.vue'),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf-8');

      // Should NOT use <a href="/about"> or <a href="/">
      const hasAnchorForInternalNav = /<a\s+[^>]*href=["']\/(?:about)?["'][^>]*>/i.test(content);
      expect(hasAnchorForInternalNav).toBe(false);
    }
  }
});
