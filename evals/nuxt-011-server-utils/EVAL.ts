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

test('Server utility exports a function with user data', () => {
  const utilsDir = join(process.cwd(), 'server', 'utils');
  const files = readdirSync(utilsDir);
  const utilFile = files.find(f => f.endsWith('.ts'));

  expect(utilFile).toBeDefined();

  const content = readFileSync(join(utilsDir, utilFile!), 'utf-8');

  // Should export a reusable function (not just data)
  expect(content).toMatch(/export\s+(default\s+)?function|export\s+const\s+\w+\s*=/);
  expect(content).toMatch(/user|User/i);
});

test('Users list API route exists', () => {
  const apiDir = join(process.cwd(), 'server', 'api');

  expect(existsSync(apiDir)).toBe(true);

  const hasUsersRoute = findFile(
    join(apiDir, 'users.ts'),
    join(apiDir, 'users.get.ts'),
    join(apiDir, 'users', 'index.ts'),
    join(apiDir, 'users', 'index.get.ts'),
  );

  expect(hasUsersRoute).toBeDefined();
});

test('Single user API route exists', () => {
  const singleRoute = findFile(
    join(process.cwd(), 'server', 'api', 'users', '[id].ts'),
    join(process.cwd(), 'server', 'api', 'users', '[id].get.ts'),
  );

  expect(singleRoute).toBeDefined();
});

test('Single user route uses defineEventHandler', () => {
  const singleRoute = findFile(
    join(process.cwd(), 'server', 'api', 'users', '[id].ts'),
    join(process.cwd(), 'server', 'api', 'users', '[id].get.ts'),
  );

  expect(singleRoute).toBeDefined();

  const content = readFileSync(singleRoute!, 'utf-8');

  expect(content).toMatch(/defineEventHandler/);
});

test('Single user route calls the shared utility', () => {
  const singleRoute = findFile(
    join(process.cwd(), 'server', 'api', 'users', '[id].ts'),
    join(process.cwd(), 'server', 'api', 'users', '[id].get.ts'),
  );

  expect(singleRoute).toBeDefined();

  const content = readFileSync(singleRoute!, 'utf-8');

  // Should call the shared util function (auto-imported), not inline the data
  expect(content).toMatch(/get[A-Z]\w*\(|find[A-Z]\w*\(|fetch[A-Z]\w*\(|users|getUser/i);

  // Should NOT define user data inline (that means the util isn't being used)
  expect(content).not.toMatch(/const\s+users\s*=\s*\[/);
});

test('List route uses defineEventHandler and shared utility', () => {
  const listRoute = findFile(
    join(process.cwd(), 'server', 'api', 'users.ts'),
    join(process.cwd(), 'server', 'api', 'users.get.ts'),
    join(process.cwd(), 'server', 'api', 'users', 'index.ts'),
    join(process.cwd(), 'server', 'api', 'users', 'index.get.ts'),
  );

  expect(listRoute).toBeDefined();

  const content = readFileSync(listRoute!, 'utf-8');

  expect(content).toMatch(/defineEventHandler/);

  // Should NOT define user data inline (that means the util isn't being used)
  expect(content).not.toMatch(/const\s+users\s*=\s*\[/);
});

test('Shared utility is NOT in app/utils/', () => {
  const wrongDir = join(process.cwd(), 'app', 'utils');

  if (existsSync(wrongDir)) {
    const files = readdirSync(wrongDir);
    const hasUserUtil = files.some(f => f.toLowerCase().includes('user'));
    expect(hasUserUtil).toBe(false);
  }
});
