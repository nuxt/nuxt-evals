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

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

test('Server utils directory exists', () => {
  const utilsDir = join(process.cwd(), 'server', 'utils');

  expect(existsSync(utilsDir)).toBe(true);
});

test('Server utils has a utility file', () => {
  const utilsDir = join(process.cwd(), 'server', 'utils');
  const files = readdirSync(utilsDir);
  const hasUtilFile = files.some(f => f.endsWith('.ts'));

  expect(hasUtilFile).toBe(true);
});

test('Server utility contains user data logic', () => {
  const utilsDir = join(process.cwd(), 'server', 'utils');
  const files = readdirSync(utilsDir);
  const utilFile = files.find(f => f.endsWith('.ts'));

  expect(utilFile).toBeDefined();

  const content = readFileSync(join(utilsDir, utilFile!), 'utf-8');

  expect(content).toMatch(/user|User/i);
});

test('Users list API route exists', () => {
  const apiDir = join(process.cwd(), 'server', 'api');

  expect(existsSync(apiDir)).toBe(true);

  const hasUsersRoute = findFile(
    join(apiDir, 'users.ts'),
    join(apiDir, 'users', 'index.ts'),
  );

  expect(hasUsersRoute).toBeDefined();
});

test('Single user API route exists', () => {
  const singleRoute = join(process.cwd(), 'server', 'api', 'users', '[id].ts');

  expect(existsSync(singleRoute)).toBe(true);
});

test('API routes use defineEventHandler', () => {
  const singleRoute = join(process.cwd(), 'server', 'api', 'users', '[id].ts');

  expect(existsSync(singleRoute)).toBe(true);

  const content = readFileSync(singleRoute, 'utf-8');

  expect(content).toMatch(/defineEventHandler/);
});

test('API routes use the shared utility', () => {
  const singleRoute = join(process.cwd(), 'server', 'api', 'users', '[id].ts');

  expect(existsSync(singleRoute)).toBe(true);

  const content = readFileSync(singleRoute, 'utf-8');

  expect(content).toMatch(/user|User/i);
});

test('Shared utility is NOT in app/utils/', () => {
  const wrongDir = join(process.cwd(), 'app', 'utils');

  if (existsSync(wrongDir)) {
    const files = readdirSync(wrongDir);
    const hasUserUtil = files.some(f => f.toLowerCase().includes('user'));
    expect(hasUserUtil).toBe(false);
  }
});
