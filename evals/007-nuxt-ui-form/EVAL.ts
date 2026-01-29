/**
 * Nuxt UI Form with Zod Validation
 *
 * Tests whether the agent can create forms using Nuxt UI components
 * with proper Zod validation and toast notifications.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

test('Index page exists with form', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const pagePath = possiblePaths.find((p) => existsSync(p));
  expect(pagePath).toBeDefined();
});

test('Uses UForm component', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const pagePath = possiblePaths.find((p) => existsSync(p));

  if (pagePath) {
    const content = readFileSync(pagePath, 'utf-8');
    expect(content).toMatch(/UForm/);
  }
});

test('Uses UFormField for fields', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const pagePath = possiblePaths.find((p) => existsSync(p));

  if (pagePath) {
    const content = readFileSync(pagePath, 'utf-8');
    expect(content).toMatch(/UFormField/);
  }
});

test('Uses UInput components', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const pagePath = possiblePaths.find((p) => existsSync(p));

  if (pagePath) {
    const content = readFileSync(pagePath, 'utf-8');
    expect(content).toMatch(/UInput/);
  }
});

test('Has email and password fields', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const pagePath = possiblePaths.find((p) => existsSync(p));

  if (pagePath) {
    const content = readFileSync(pagePath, 'utf-8');

    // Should have email field
    expect(content).toMatch(/email/i);

    // Should have password field
    expect(content).toMatch(/password/i);
  }
});

test('Uses Zod for validation', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const pagePath = possiblePaths.find((p) => existsSync(p));

  if (pagePath) {
    const content = readFileSync(pagePath, 'utf-8');

    // Should import or use zod
    expect(content).toMatch(/zod|z\./);
  }
});

test('Uses useToast for submission feedback', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const pagePath = possiblePaths.find((p) => existsSync(p));

  if (pagePath) {
    const content = readFileSync(pagePath, 'utf-8');
    expect(content).toMatch(/useToast/);
  }
});

test('Has reactive state for form', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'index.vue'),
    join(rootDir, 'pages', 'index.vue'),
  ];

  const pagePath = possiblePaths.find((p) => existsSync(p));

  if (pagePath) {
    const content = readFileSync(pagePath, 'utf-8');

    // Should use reactive or ref for state
    expect(content).toMatch(/reactive|ref/);
  }
});
