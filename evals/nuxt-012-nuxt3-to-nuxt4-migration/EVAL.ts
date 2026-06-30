/**
 * Nuxt 3 to Nuxt 4 Migration
 *
 * Tests whether the agent can migrate a Nuxt 3 app to the Nuxt 4 directory
 * structure — moving pages, components, composables, layouts, middleware,
 * app.vue, and app.config.ts into the app/ directory while keeping server/,
 * public/, and nuxt.config.ts at the project root.
 *
 * Also checks the nuxt version upgrade.
 *
 * Tricky because agents often do incomplete migrations: moving server/ inside
 * app/, leaving files in both locations, leaving app.vue/app.config.ts at the
 * root, or leaving the old root source directories behind.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const root = process.cwd();

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

// --- Directory structure tests ---

test('app/ directory exists', () => {
  expect(existsSync(join(root, 'app'))).toBe(true);
});

test('Pages moved into app/', () => {
  const indexPage = findFile(join(root, 'app', 'pages', 'index.vue'));
  const aboutPage = findFile(join(root, 'app', 'pages', 'about.vue'));

  expect(indexPage).toBeDefined();
  expect(aboutPage).toBeDefined();
});

test('Components moved into app/', () => {
  expect(findFile(join(root, 'app', 'components', 'AppHeader.vue'))).toBeDefined();
});

test('Composables moved into app/', () => {
  expect(findFile(join(root, 'app', 'composables', 'useCounter.ts'))).toBeDefined();
});

test('Layouts moved into app/', () => {
  expect(findFile(join(root, 'app', 'layouts', 'default.vue'))).toBeDefined();
});

test('Middleware moved into app/', () => {
  expect(findFile(join(root, 'app', 'middleware', 'auth.ts'))).toBeDefined();
});

test('app.vue moved into app/ (and not left at root)', () => {
  expect(findFile(join(root, 'app', 'app.vue'))).toBeDefined();
  expect(existsSync(join(root, 'app.vue'))).toBe(false);
});

test('app.config.ts moved into app/ (and not left at root)', () => {
  expect(findFile(join(root, 'app', 'app.config.ts'))).toBeDefined();
  expect(existsSync(join(root, 'app.config.ts'))).toBe(false);
});

test('server/ stays at project root (not inside app/)', () => {
  expect(findFile(join(root, 'server', 'api', 'hello.ts'))).toBeDefined();
  expect(existsSync(join(root, 'app', 'server'))).toBe(false);
});

test('nuxt.config.ts stays at project root', () => {
  expect(existsSync(join(root, 'nuxt.config.ts'))).toBe(true);
  expect(existsSync(join(root, 'app', 'nuxt.config.ts'))).toBe(false);
});

test('Nuxt dependency upgraded to v4', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
  const nuxtVersion = pkg.dependencies?.nuxt || pkg.devDependencies?.nuxt || '';

  expect(nuxtVersion).not.toMatch(/^\^?3\./);
  expect(nuxtVersion).toMatch(/^\^?4/);
});

test('Old root-level source directories are fully cleaned up', () => {
  const oldDirsRemaining = ['pages', 'components', 'composables', 'layouts', 'middleware']
    .filter(dir => existsSync(join(root, dir)))
    .length;

  // A complete migration leaves no source directories behind at the root.
  expect(oldDirsRemaining).toBe(0);
});
