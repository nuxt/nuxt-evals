/**
 * Nuxt API Route and Data Fetching
 *
 * Tests whether the agent creates API routes in the correct location and uses
 * Nuxt's data fetching composables instead of client-side fetch patterns.
 *
 * Tricky because agents often place API routes in wrong directories or use
 * onMounted + fetch instead of useFetch/useAsyncData.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

test('API route exists in server/api directory', () => {
  const serverApiDir = join(process.cwd(), 'server', 'api');

  expect(existsSync(serverApiDir)).toBe(true);

  const files = readdirSync(serverApiDir);
  const hasApiRoute = files.some(f => f.endsWith('.ts') || f.endsWith('.js'));

  expect(hasApiRoute).toBe(true);
});

test('API route uses defineEventHandler', () => {
  const serverApiDir = join(process.cwd(), 'server', 'api');
  const files = readdirSync(serverApiDir);
  const apiFile = files.find(f => f.endsWith('.ts') || f.endsWith('.js'));

  const content = readFileSync(join(serverApiDir, apiFile!), 'utf-8');

  expect(content).toMatch(/defineEventHandler/);
});

test('Frontend uses Nuxt data fetching composables', () => {
  const appVuePath = join(process.cwd(), 'app', 'app.vue');
  const content = readFileSync(appVuePath, 'utf-8');

  // Should use useFetch, useAsyncData, or $fetch (not raw fetch in onMounted)
  expect(content).toMatch(/useFetch|useAsyncData|\$fetch/);
});

test('Frontend does not use onMounted + fetch anti-pattern', () => {
  const appVuePath = join(process.cwd(), 'app', 'app.vue');
  const content = readFileSync(appVuePath, 'utf-8');

  // Should NOT use onMounted with fetch
  const hasAntiPattern = /onMounted[\s\S]*?fetch\(/.test(content);
  expect(hasAntiPattern).toBe(false);
});

test('Frontend displays the fetched data', () => {
  const appVuePath = join(process.cwd(), 'app', 'app.vue');
  const content = readFileSync(appVuePath, 'utf-8');

  // Should have template with data binding
  expect(content).toMatch(/<template>[\s\S]*\{\{[\s\S]*\}\}[\s\S]*<\/template>/);
});
