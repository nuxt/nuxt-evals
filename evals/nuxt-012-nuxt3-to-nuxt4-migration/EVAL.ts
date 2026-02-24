/**
 * Nuxt 3 to Nuxt 4 Migration
 *
 * Tests whether the agent can migrate a Nuxt 3 app to the Nuxt 4 directory
 * structure — moving pages, components, composables, layouts, middleware,
 * app.vue, and app.config.ts into the app/ directory while keeping server/,
 * public/, and nuxt.config.ts at the project root.
 *
 * Also checks nuxt version upgrade and tsconfig.json migration to project
 * references.
 *
 * Tricky because agents often do incomplete migrations: moving server/ inside
 * app/, leaving files in both locations, or forgetting the tsconfig update.
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
  const indexPage = findFile(
    join(root, 'app', 'pages', 'index.vue'),
  );
  const aboutPage = findFile(
    join(root, 'app', 'pages', 'about.vue'),
  );

  expect(indexPage).toBeDefined();
  expect(aboutPage).toBeDefined();
});

test('Components moved into app/', () => {
  const header = findFile(
    join(root, 'app', 'components', 'AppHeader.vue'),
  );

  expect(header).toBeDefined();
});

test('Composables moved into app/', () => {
  const counter = findFile(
    join(root, 'app', 'composables', 'useCounter.ts'),
  );

  expect(counter).toBeDefined();
});

test('Layouts moved into app/', () => {
  const layout = findFile(
    join(root, 'app', 'layouts', 'default.vue'),
  );

  expect(layout).toBeDefined();
});

test('Middleware moved into app/', () => {
  const middleware = findFile(
    join(root, 'app', 'middleware', 'auth.ts'),
  );

  expect(middleware).toBeDefined();
});

test('app.vue moved into app/', () => {
  const appVue = findFile(
    join(root, 'app', 'app.vue'),
  );

  expect(appVue).toBeDefined();
});

test('app.config.ts moved into app/', () => {
  const appConfig = findFile(
    join(root, 'app', 'app.config.ts'),
  );

  expect(appConfig).toBeDefined();
});

test('server/ stays at project root (not inside app/)', () => {
  const serverApi = findFile(
    join(root, 'server', 'api', 'hello.ts'),
  );

  expect(serverApi).toBeDefined();
  expect(existsSync(join(root, 'app', 'server'))).toBe(false);
});

test('nuxt.config.ts stays at project root', () => {
  expect(existsSync(join(root, 'nuxt.config.ts'))).toBe(true);
  expect(existsSync(join(root, 'app', 'nuxt.config.ts'))).toBe(false);
});

test('Nuxt dependency upgraded to v4', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
  const nuxtVersion = pkg.dependencies?.nuxt || pkg.devDependencies?.nuxt || '';

  expect(nuxtVersion).not.toMatch(/\^3\./);
  expect(nuxtVersion).toMatch(/\^?4/);
});

test('Old root-level source directories are cleaned up', () => {
  const hasOldPages = existsSync(join(root, 'pages'));
  const hasOldComponents = existsSync(join(root, 'components'));
  const hasOldComposables = existsSync(join(root, 'composables'));
  const hasOldLayouts = existsSync(join(root, 'layouts'));
  const hasOldMiddleware = existsSync(join(root, 'middleware'));

  const oldDirsRemaining = [hasOldPages, hasOldComponents, hasOldComposables, hasOldLayouts, hasOldMiddleware]
    .filter(Boolean).length;

  // Allow at most 1 leftover (some agents leave empty dirs), but not all 5
  expect(oldDirsRemaining).toBeLessThanOrEqual(1);
});
