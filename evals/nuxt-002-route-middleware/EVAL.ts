/**
 * Nuxt Route Middleware
 *
 * Tests whether the agent creates route middleware in the correct location and
 * uses the proper Nuxt patterns (defineNuxtRouteMiddleware or export default, navigateTo).
 *
 * Tricky because agents confuse route middleware (middleware/) with server
 * middleware (server/middleware/) or use wrong functions like defineEventHandler.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

test('Auth middleware exists in middleware directory (not server/middleware)', () => {
  const middlewarePath = findFile(
    join(process.cwd(), 'app', 'middleware', 'auth.ts'),
    join(process.cwd(), 'middleware', 'auth.ts'),
  );
  const wrongPath = join(process.cwd(), 'server', 'middleware', 'auth.ts');

  expect(middlewarePath).toBeDefined();
  expect(existsSync(wrongPath)).toBe(false);
});

test('Middleware uses defineNuxtRouteMiddleware or exports a function', () => {
  const middlewarePath = findFile(
    join(process.cwd(), 'app', 'middleware', 'auth.ts'),
    join(process.cwd(), 'middleware', 'auth.ts'),
  );

  expect(middlewarePath).toBeDefined();

  const content = readFileSync(middlewarePath!, 'utf-8');

  // Should use defineNuxtRouteMiddleware (preferred) or export default a function
  expect(content).toMatch(/defineNuxtRouteMiddleware|export\s+default/);
  expect(content).not.toMatch(/defineEventHandler/);
});

test('Middleware uses navigateTo for redirect', () => {
  const middlewarePath = findFile(
    join(process.cwd(), 'app', 'middleware', 'auth.ts'),
    join(process.cwd(), 'middleware', 'auth.ts'),
  );

  expect(middlewarePath).toBeDefined();

  const content = readFileSync(middlewarePath!, 'utf-8');

  expect(content).toMatch(/navigateTo/);
  expect(content).toMatch(/login/i);
});

test('Login page exists', () => {
  const loginPath = findFile(
    join(process.cwd(), 'app', 'pages', 'login.vue'),
    join(process.cwd(), 'app', 'pages', 'login', 'index.vue'),
    join(process.cwd(), 'pages', 'login.vue'),
    join(process.cwd(), 'pages', 'login', 'index.vue'),
  );

  expect(loginPath).toBeDefined();
});

test('Dashboard page exists and applies middleware', () => {
  const dashboardPath = findFile(
    join(process.cwd(), 'app', 'pages', 'dashboard.vue'),
    join(process.cwd(), 'app', 'pages', 'dashboard', 'index.vue'),
    join(process.cwd(), 'pages', 'dashboard.vue'),
    join(process.cwd(), 'pages', 'dashboard', 'index.vue'),
  );

  expect(dashboardPath).toBeDefined();

  const content = readFileSync(dashboardPath!, 'utf-8');

  expect(content).toMatch(/definePageMeta/);
  expect(content).toMatch(/middleware/);
});
