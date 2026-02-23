/**
 * Nuxt Route Validation
 *
 * Tests whether the agent uses definePageMeta's validate option to
 * validate route parameters instead of using middleware or manual checks.
 *
 * Tricky because agents often use middleware for route validation or
 * do manual validation in setup/onMounted instead of using the built-in
 * validate option in definePageMeta.
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
    join(process.cwd(), 'pages', 'users', '[id].vue'),
    join(process.cwd(), 'app', 'pages', 'user', '[id].vue'),
    join(process.cwd(), 'pages', 'user', '[id].vue'),
  );

  expect(userPath).toBeDefined();
});

test('Page uses definePageMeta with validate', () => {
  const userPath = findFile(
    join(process.cwd(), 'app', 'pages', 'users', '[id].vue'),
    join(process.cwd(), 'pages', 'users', '[id].vue'),
    join(process.cwd(), 'app', 'pages', 'user', '[id].vue'),
    join(process.cwd(), 'pages', 'user', '[id].vue'),
  );

  expect(userPath).toBeDefined();

  const content = readFileSync(userPath!, 'utf-8');

  // Should use definePageMeta with validate
  expect(content).toMatch(/definePageMeta/);
  expect(content).toMatch(/validate/);
});

test('Validation checks for numeric ID', () => {
  const userPath = findFile(
    join(process.cwd(), 'app', 'pages', 'users', '[id].vue'),
    join(process.cwd(), 'pages', 'users', '[id].vue'),
    join(process.cwd(), 'app', 'pages', 'user', '[id].vue'),
    join(process.cwd(), 'pages', 'user', '[id].vue'),
  );

  expect(userPath).toBeDefined();

  const content = readFileSync(userPath!, 'utf-8');

  // Should validate that ID is numeric (Number, parseInt, isNaN, regex, etc.)
  expect(content).toMatch(/Number|parseInt|isNaN|isFinite|\/\\d|test\(/);
});

test('Page displays user information using the ID', () => {
  const userPath = findFile(
    join(process.cwd(), 'app', 'pages', 'users', '[id].vue'),
    join(process.cwd(), 'pages', 'users', '[id].vue'),
    join(process.cwd(), 'app', 'pages', 'user', '[id].vue'),
    join(process.cwd(), 'pages', 'user', '[id].vue'),
  );

  expect(userPath).toBeDefined();

  const content = readFileSync(userPath!, 'utf-8');

  // Should access route params and display content
  expect(content).toMatch(/useRoute|route|params/);
  expect(content).toMatch(/<template>[\s\S]*\{\{[\s\S]*\}\}[\s\S]*<\/template>/);
});

