/**
 * Fix Raw HTML Form with Nuxt UI Components
 *
 * Tests whether the agent replaces a raw HTML form with manual validation
 * with Nuxt UI's UForm + UFormField + UInput components and Zod schema.
 *
 * Tricky because the raw form works, but uses manual validation logic
 * instead of Nuxt UI's declarative schema-based validation. The agent must
 * also replace native <input> with UInput, <form> with UForm, etc.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function getFormPageContent(): string {
  const candidates = [
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'pages', 'login.vue'),
    join(process.cwd(), 'app', 'pages', 'login', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return readFileSync(candidate, 'utf-8');
    }
  }

  throw new Error('No form page found');
}

test('Uses UForm component', () => {
  const content = getFormPageContent();
  expect(content).toMatch(/<UForm/);
});

test('UForm has :schema and :state bindings', () => {
  const content = getFormPageContent();
  expect(content).toMatch(/:schema/);
  expect(content).toMatch(/:state/);
});

test('UForm has @submit handler', () => {
  const content = getFormPageContent();
  expect(content).toMatch(/@submit/);
});

test('Uses UFormField for form fields', () => {
  const content = getFormPageContent();
  expect(content).toMatch(/UFormField/);
});

test('Uses UInput instead of raw input', () => {
  const content = getFormPageContent();
  expect(content).toMatch(/UInput/);
});

test('No raw HTML form elements', () => {
  const content = getFormPageContent();
  expect(content).not.toMatch(/<form[\s>]/);
  expect(content).not.toMatch(/<input[\s>]/);
});

test('No manual validation function', () => {
  const content = getFormPageContent();
  expect(content).not.toMatch(/function\s+validate\s*\(/);
  expect(content).not.toMatch(/errors\.value\.\w+\s*=/);
});

test('Uses Zod for validation schema', () => {
  const content = getFormPageContent();
  expect(content).toMatch(/z\.\s*object/);
});

test('Uses reactive state (not individual refs)', () => {
  const content = getFormPageContent();
  expect(content).toMatch(/reactive/);
});

test('Has email and password fields', () => {
  const content = getFormPageContent();
  expect(content).toMatch(/email/i);
  expect(content).toMatch(/password/i);
});

test('Uses UButton for submit', () => {
  const content = getFormPageContent();
  expect(content).toMatch(/UButton/);
});
