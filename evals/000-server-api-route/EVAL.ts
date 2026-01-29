/**
 * Nuxt API Route and Data Fetching
 *
 * Tests whether the agent can create API routes in Nuxt and implement proper
 * data fetching patterns. Agents often make mistakes like placing API routes
 * in wrong directories or using client-side fetch instead of Nuxt composables.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

test('API route exists in server/api directory', () => {
  const rootDir = process.cwd();
  const serverApiDir = join(rootDir, 'server', 'api');

  // server/api directory should exist
  expect(existsSync(serverApiDir)).toBe(true);

  // Check for hello.ts or hello.js file
  const helloTsPath = join(serverApiDir, 'hello.ts');
  const helloJsPath = join(serverApiDir, 'hello.js');
  const helloExists = existsSync(helloTsPath) || existsSync(helloJsPath);

  expect(helloExists).toBe(true);
});

test('API route uses defineEventHandler', () => {
  const rootDir = process.cwd();
  const helloTsPath = join(rootDir, 'server', 'api', 'hello.ts');
  const helloJsPath = join(rootDir, 'server', 'api', 'hello.js');

  const filePath = existsSync(helloTsPath) ? helloTsPath : helloJsPath;

  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf-8');

    // Should use defineEventHandler
    expect(content).toMatch(/defineEventHandler/);

    // Should return hello: 'world' or similar
    expect(content).toMatch(/hello/i);
  }
});

test('Frontend uses Nuxt data fetching composables', () => {
  const rootDir = process.cwd();

  // Check app.vue or pages/index.vue
  const appVuePath = join(rootDir, 'app', 'app.vue');
  const indexPagePath = join(rootDir, 'app', 'pages', 'index.vue');

  let frontendContent = '';

  if (existsSync(appVuePath)) {
    frontendContent = readFileSync(appVuePath, 'utf-8');
  } else if (existsSync(indexPagePath)) {
    frontendContent = readFileSync(indexPagePath, 'utf-8');
  }

  // Should use useFetch or useAsyncData (not raw fetch)
  const usesNuxtComposables = /useFetch|useAsyncData|\$fetch/.test(frontendContent);
  expect(usesNuxtComposables).toBe(true);

  // Should reference the API endpoint
  expect(frontendContent).toMatch(/\/api\/hello|api\/hello/);
});

test('Frontend displays the API data', () => {
  const rootDir = process.cwd();

  const appVuePath = join(rootDir, 'app', 'app.vue');
  const indexPagePath = join(rootDir, 'app', 'pages', 'index.vue');

  let frontendContent = '';

  if (existsSync(appVuePath)) {
    frontendContent = readFileSync(appVuePath, 'utf-8');
  } else if (existsSync(indexPagePath)) {
    frontendContent = readFileSync(indexPagePath, 'utf-8');
  }

  // Should have template that displays data
  expect(frontendContent).toMatch(/<template>/);

  // Should reference data in template (data.hello or similar)
  expect(frontendContent).toMatch(/data|hello/i);
});

test('No raw fetch in useEffect/onMounted pattern', () => {
  const rootDir = process.cwd();

  const appVuePath = join(rootDir, 'app', 'app.vue');
  const indexPagePath = join(rootDir, 'app', 'pages', 'index.vue');

  let frontendContent = '';

  if (existsSync(appVuePath)) {
    frontendContent = readFileSync(appVuePath, 'utf-8');
  } else if (existsSync(indexPagePath)) {
    frontendContent = readFileSync(indexPagePath, 'utf-8');
  }

  // Should NOT use onMounted with fetch (anti-pattern in Nuxt)
  const hasAntiPattern = /onMounted\s*\(\s*(?:async\s*)?\(\s*\)\s*=>\s*\{[\s\S]*?fetch\(/.test(frontendContent);
  expect(hasAntiPattern).toBe(false);
});
