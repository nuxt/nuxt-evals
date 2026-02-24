/**
 * Fix Exposed Secret
 *
 * Tests whether the agent recognizes that private runtimeConfig keys
 * are not available on the client and moves the API status check to
 * a server route.
 *
 * Tricky because the bug report says "users see undefined" — the agent
 * must understand that private runtimeConfig is server-only, and the fix
 * is to create a server API route, not to move the secret to public config.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function getPageContent(): string {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  if (!pagePath) throw new Error('No page found');
  return readFileSync(pagePath, 'utf-8');
}

test('Page does not access private runtimeConfig keys', () => {
  const content = getPageContent();

  expect(content).not.toMatch(/config\.apiSecret|runtimeConfig.*apiSecret/);
});

test('A server API route exists for status check', () => {
  const serverApiDir = join(process.cwd(), 'server', 'api');
  expect(existsSync(serverApiDir)).toBe(true);

  const files = readdirSync(serverApiDir);
  const hasStatusRoute = files.some(f => f.endsWith('.ts'));
  expect(hasStatusRoute).toBe(true);
});

test('Server route uses runtimeConfig for the secret', () => {
  const serverApiDir = join(process.cwd(), 'server', 'api');
  const files = readdirSync(serverApiDir);
  const apiFile = files.find(f => f.endsWith('.ts'));

  expect(apiFile).toBeDefined();

  const content = readFileSync(join(serverApiDir, apiFile!), 'utf-8');
  expect(content).toMatch(/useRuntimeConfig|runtimeConfig/);
});

test('Page uses useFetch to call the server route', () => {
  const content = getPageContent();

  expect(content).toMatch(/useFetch|useAsyncData/);
});

test('Private key was NOT moved to public config', () => {
  const configPath = join(process.cwd(), 'nuxt.config.ts');
  const content = readFileSync(configPath, 'utf-8');

  // apiSecret should NOT be inside public section
  expect(content).not.toMatch(/public[\s\S]*apiSecret/);
});

test('Page still displays app name', () => {
  const content = getPageContent();

  expect(content).toMatch(/appName|App/);
});

test('Page displays API status from server route', () => {
  const content = getPageContent();

  // Should show some status indicator
  expect(content).toMatch(/[Ss]tatus|[Cc]onnect/);
});
