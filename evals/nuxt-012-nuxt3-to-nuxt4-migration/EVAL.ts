/**
 * Nuxt 3 to Nuxt 4 Migration
 *
 * Tests whether the agent can migrate a Nuxt 3 app to the Nuxt 4 directory
 * structure: pages, components, composables, layouts, middleware, app.vue and
 * app.config.ts move into app/, while server/ and nuxt.config.ts stay at the
 * project root. Nuxt 4 uses app/ as srcDir as soon as it holds any source file (verified on
 * nuxt 4.6.4, @nuxt/schema srcDir resolver), so a half-done move silently
 * drops whatever is left at the root.
 *
 * Checks:
 * - every source file exists under app/, and nothing is left at the root
 *   (agents often copy instead of move, or leave app.vue/app.config.ts behind);
 * - server/ is not moved into app/ (Nuxt 4 resolves serverDir from rootDir);
 * - package.json targets nuxt 4. Any range whose floor is 4 is accepted
 *   (^4, ~4, >=4, an exact 4.x.y); a dist-tag like "latest" is not a version;
 * - the moved files keep their behaviour, so stubbing them out to satisfy the
 *   existence checks does not pass.
 *
 * The starter has no code that breaks on Nuxt 4, so this eval only grades the
 * structure and the version bump. The build step then proves the app compiles.
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

  expect(nuxtVersion).toMatch(/^(?:[\^~]|>=?\s*)?4(?:\.|$)/);
});

test('Old root-level source directories are fully cleaned up', () => {
  const oldDirsRemaining = ['pages', 'components', 'composables', 'layouts', 'middleware']
    .filter(dir => existsSync(join(root, dir)))
    .length;

  // A complete migration leaves no source directories behind at the root.
  expect(oldDirsRemaining).toBe(0);
});

test('Moved files keep their behaviour', () => {
  const read = (...p: string[]) => readFileSync(join(root, 'app', ...p), 'utf-8');

  expect(read('pages', 'index.vue')).toMatch(/useCounter\(/);
  expect(read('pages', 'index.vue')).toMatch(/\/api\/hello/);
  expect(read('components', 'AppHeader.vue')).toMatch(/useAppConfig\(/);
  expect(read('layouts', 'default.vue')).toMatch(/<AppHeader/);
  expect(read('composables', 'useCounter.ts')).toMatch(/useState\(/);
  expect(read('middleware', 'auth.ts')).toMatch(/navigateTo\(/);
  expect(read('app.config.ts')).toMatch(/My Nuxt App/);
  expect(read('app.vue')).toMatch(/<NuxtPage/);
});
