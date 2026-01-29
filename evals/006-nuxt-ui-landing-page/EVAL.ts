/**
 * Nuxt UI Landing Page
 *
 * Tests whether the agent can create a landing page using Nuxt UI components
 * like UPageHero and UPageSection with proper props.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

test('Homepage exists with landing page content', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'app', 'app.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const homePath = possiblePaths.find((p) => existsSync(p));
  expect(homePath).toBeDefined();
});

test('Uses UPageHero component', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'app', 'app.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const pagePath = possiblePaths.find((p) => existsSync(p));

  if (pagePath) {
    const content = readFileSync(pagePath, 'utf-8');

    // Should use UPageHero
    expect(content).toMatch(/UPageHero/);
  }
});

test('UPageHero has required props', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'app', 'app.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const pagePath = possiblePaths.find((p) => existsSync(p));

  if (pagePath) {
    const content = readFileSync(pagePath, 'utf-8');

    // Should have title prop
    expect(content).toMatch(/title/);

    // Should have description prop
    expect(content).toMatch(/description/);

    // Should have links prop
    expect(content).toMatch(/links/);
  }
});

test('Uses UPageSection component', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'app', 'app.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const pagePath = possiblePaths.find((p) => existsSync(p));

  if (pagePath) {
    const content = readFileSync(pagePath, 'utf-8');

    // Should use UPageSection
    expect(content).toMatch(/UPageSection/);
  }
});

test('UPageSection has features prop with 3 features', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'app', 'app.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const pagePath = possiblePaths.find((p) => existsSync(p));

  if (pagePath) {
    const content = readFileSync(pagePath, 'utf-8');

    // Should have features prop
    expect(content).toMatch(/features/);

    // Check for array with multiple items (script setup or template)
    // This is a heuristic check for 3 features
    const featureMatches = content.match(/icon|title|description/g);
    expect(featureMatches && featureMatches.length >= 6).toBe(true); // At least 2 props per feature
  }
});
