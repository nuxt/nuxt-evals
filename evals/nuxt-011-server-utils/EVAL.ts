/**
 * Nuxt Server Utils
 *
 * Tests whether the agent creates shared server utilities in server/utils/
 * and uses them across multiple API routes.
 *
 * Tricky because agents often duplicate logic across API routes instead of
 * extracting shared code to server/utils/. They also sometimes place server
 * utilities in app/utils/ (which is client-side).
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

test('Server utils directory exists', () => {
  const utilsDir = join(process.cwd(), 'server', 'utils');

  expect(existsSync(utilsDir)).toBe(true);
});

test('Server utils has a utility file', () => {
  const utilsDir = join(process.cwd(), 'server', 'utils');
  const files = readdirSync(utilsDir);
  const hasUtilFile = files.some(f => f.endsWith('.ts') || f.endsWith('.js'));

  expect(hasUtilFile).toBe(true);
});

test('Server utility contains user data logic', () => {
  const utilsDir = join(process.cwd(), 'server', 'utils');
  const files = readdirSync(utilsDir);
  const utilFile = files.find(f => f.endsWith('.ts') || f.endsWith('.js'));

  const content = readFileSync(join(utilsDir, utilFile!), 'utf-8');

  // Should contain user data or a function that provides it
  expect(content).toMatch(/user|User/i);
});

test('Users list API route exists', () => {
  const apiDir = join(process.cwd(), 'server', 'api');

  expect(existsSync(apiDir)).toBe(true);

  const hasUsersRoute = existsSync(join(apiDir, 'users.ts'))
    || existsSync(join(apiDir, 'users.js'))
    || existsSync(join(apiDir, 'users', 'index.ts'))
    || existsSync(join(apiDir, 'users', 'index.js'));

  expect(hasUsersRoute).toBe(true);
});

test('Single user API route exists', () => {
  const apiDir = join(process.cwd(), 'server', 'api');

  const hasSingleRoute = existsSync(join(apiDir, 'users', '[id].ts'))
    || existsSync(join(apiDir, 'users', '[id].js'));

  expect(hasSingleRoute).toBe(true);
});

test('API routes use defineEventHandler', () => {
  const apiDir = join(process.cwd(), 'server', 'api');

  // Check the single user route
  let routeContent = '';
  if (existsSync(join(apiDir, 'users', '[id].ts'))) {
    routeContent = readFileSync(join(apiDir, 'users', '[id].ts'), 'utf-8');
  } else if (existsSync(join(apiDir, 'users', '[id].js'))) {
    routeContent = readFileSync(join(apiDir, 'users', '[id].js'), 'utf-8');
  }

  expect(routeContent).toMatch(/defineEventHandler/);
});

test('API routes use the shared utility', () => {
  const apiDir = join(process.cwd(), 'server', 'api');

  // Check routes reference the utility function
  let routeContent = '';
  if (existsSync(join(apiDir, 'users', '[id].ts'))) {
    routeContent = readFileSync(join(apiDir, 'users', '[id].ts'), 'utf-8');
  } else if (existsSync(join(apiDir, 'users', '[id].js'))) {
    routeContent = readFileSync(join(apiDir, 'users', '[id].js'), 'utf-8');
  }

  // Should reference a shared utility function (via auto-import or explicit import)
  expect(routeContent).toMatch(/user|User/i);
});

test('Shared utility is NOT in app/utils/', () => {
  // Server utils should be in server/utils/, not app/utils/
  const wrongDir = join(process.cwd(), 'app', 'utils');

  if (existsSync(wrongDir)) {
    const files = readdirSync(wrongDir);
    const hasUserUtil = files.some(f => f.toLowerCase().includes('user'));
    expect(hasUserUtil).toBe(false);
  }
});
