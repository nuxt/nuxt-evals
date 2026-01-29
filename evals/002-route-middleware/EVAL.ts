/**
 * Nuxt Route Middleware
 *
 * Tests whether the agent can create route middleware for authentication.
 * Agents often confuse route middleware (middleware/) with server middleware
 * (server/middleware/) or use wrong functions like defineEventHandler.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

test('Auth middleware exists in correct directory', () => {
  const rootDir = process.cwd();

  // Should be in middleware/ (not server/middleware/)
  const authMiddlewarePath = join(rootDir, 'middleware', 'auth.ts');
  const authMiddlewareJsPath = join(rootDir, 'middleware', 'auth.js');

  const exists = existsSync(authMiddlewarePath) || existsSync(authMiddlewareJsPath);
  expect(exists).toBe(true);

  // Should NOT be in server/middleware/
  const wrongPath = join(rootDir, 'server', 'middleware', 'auth.ts');
  expect(existsSync(wrongPath)).toBe(false);
});

test('Middleware uses defineNuxtRouteMiddleware', () => {
  const rootDir = process.cwd();

  const authMiddlewarePath = existsSync(join(rootDir, 'middleware', 'auth.ts'))
    ? join(rootDir, 'middleware', 'auth.ts')
    : join(rootDir, 'middleware', 'auth.js');

  if (existsSync(authMiddlewarePath)) {
    const content = readFileSync(authMiddlewarePath, 'utf-8');

    // Should use defineNuxtRouteMiddleware (not defineEventHandler)
    expect(content).toMatch(/defineNuxtRouteMiddleware/);
    expect(content).not.toMatch(/defineEventHandler/);
  }
});

test('Middleware redirects to /login using navigateTo', () => {
  const rootDir = process.cwd();

  const authMiddlewarePath = existsSync(join(rootDir, 'middleware', 'auth.ts'))
    ? join(rootDir, 'middleware', 'auth.ts')
    : join(rootDir, 'middleware', 'auth.js');

  if (existsSync(authMiddlewarePath)) {
    const content = readFileSync(authMiddlewarePath, 'utf-8');

    // Should use navigateTo
    expect(content).toMatch(/navigateTo/);

    // Should redirect to /login
    expect(content).toMatch(/['"]\/login['"]/);
  }
});

test('Login page exists', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'login.vue'),
    join(rootDir, 'app', 'pages', 'login', 'index.vue'),
    join(rootDir, 'pages', 'login.vue'),
    join(rootDir, 'pages', 'login', 'index.vue'),
  ];

  const loginPageExists = possiblePaths.some((p) => existsSync(p));
  expect(loginPageExists).toBe(true);
});

test('Dashboard page exists and applies auth middleware', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'dashboard.vue'),
    join(rootDir, 'app', 'pages', 'dashboard', 'index.vue'),
    join(rootDir, 'pages', 'dashboard.vue'),
    join(rootDir, 'pages', 'dashboard', 'index.vue'),
  ];

  const dashboardPath = possiblePaths.find((p) => existsSync(p));
  expect(dashboardPath).toBeDefined();

  if (dashboardPath) {
    const content = readFileSync(dashboardPath, 'utf-8');

    // Should use definePageMeta with middleware
    expect(content).toMatch(/definePageMeta/);
    expect(content).toMatch(/middleware.*auth|middleware:\s*['"]auth['"]/);
  }
});

test('Login page displays correct content', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'login.vue'),
    join(rootDir, 'app', 'pages', 'login', 'index.vue'),
    join(rootDir, 'pages', 'login.vue'),
    join(rootDir, 'pages', 'login', 'index.vue'),
  ];

  const loginPath = possiblePaths.find((p) => existsSync(p));

  if (loginPath) {
    const content = readFileSync(loginPath, 'utf-8');
    expect(content).toMatch(/Login/i);
  }
});
