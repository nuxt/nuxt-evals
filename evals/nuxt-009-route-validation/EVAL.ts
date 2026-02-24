/**
 * Nuxt Route Validation
 *
 * Tests whether the agent uses definePageMeta to validate route parameters
 * — either via the validate option or a custom regex path constraint.
 *
 * Tricky because agents often use middleware for route validation or
 * do manual validation in setup/onMounted instead of using the built-in
 * definePageMeta options (validate or path with regex).
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

test('Dynamic user page exists', () => {
  const userPath = findFile(
    join(process.cwd(), 'app', 'pages', 'users', '[id].vue'),
    join(process.cwd(), 'app', 'pages', 'user', '[id].vue'),
  );

  expect(userPath).toBeDefined();
});

test('Page uses definePageMeta for route validation', () => {
  const userPath = findFile(
    join(process.cwd(), 'app', 'pages', 'users', '[id].vue'),
    join(process.cwd(), 'app', 'pages', 'user', '[id].vue'),
  );

  expect(userPath).toBeDefined();

  const content = readFileSync(userPath!, 'utf-8');

  // Should use definePageMeta with either validate function or custom path regex
  expect(content).toMatch(/definePageMeta/);
  const hasValidate = /validate\s*[:(]/.test(content);
  const hasPathRegex = /path\s*:/.test(content);
  expect(hasValidate || hasPathRegex).toBe(true);
});

test('Validation checks for numeric ID', () => {
  const userPath = findFile(
    join(process.cwd(), 'app', 'pages', 'users', '[id].vue'),
    join(process.cwd(), 'app', 'pages', 'user', '[id].vue'),
  );

  expect(userPath).toBeDefined();

  const content = readFileSync(userPath!, 'utf-8');

  // Should validate that ID is numeric — either via:
  // 1. validate function: Number, parseInt, isNaN, isFinite, /\d+/.test()
  // 2. path regex: path: '/:id(\\d+)'
  expect(content).toMatch(/Number|parseInt|isNaN|isFinite|\\d|test\(/);
});

test('Does not use middleware for route validation', () => {
  const userPath = findFile(
    join(process.cwd(), 'app', 'pages', 'users', '[id].vue'),
    join(process.cwd(), 'app', 'pages', 'user', '[id].vue'),
  );

  expect(userPath).toBeDefined();

  const content = readFileSync(userPath!, 'utf-8');

  // Should NOT use middleware for simple param validation —
  // definePageMeta.validate or path regex is the right tool
  expect(content).not.toMatch(/middleware\s*:/);
});

test('Page displays user information using the ID', () => {
  const userPath = findFile(
    join(process.cwd(), 'app', 'pages', 'users', '[id].vue'),
    join(process.cwd(), 'app', 'pages', 'user', '[id].vue'),
  );

  expect(userPath).toBeDefined();

  const content = readFileSync(userPath!, 'utf-8');

  // Should access route params and display content
  expect(content).toMatch(/useRoute|route|params/);
  expect(content).toMatch(/<template>[\s\S]*\{\{[\s\S]*\}\}[\s\S]*<\/template>/);
});

