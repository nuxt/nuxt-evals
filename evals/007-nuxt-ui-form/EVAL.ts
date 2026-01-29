/**
 * Nuxt UI Form with Validation
 *
 * Tests whether the agent uses Nuxt UI form components correctly with
 * proper validation (Zod or Yup) and toast notifications.
 *
 * Tricky because agents might use native form elements instead of UForm
 * or skip proper validation setup.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function getFormPageContent(): string {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  if (!pagePath) {
    throw new Error('No form page found');
  }

  return readFileSync(pagePath, 'utf-8');
}

test('Form page exists', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();
});

test('Uses UForm component', () => {
  const content = getFormPageContent();

  expect(content).toMatch(/UForm/);
});

test('Uses UFormField for form fields', () => {
  const content = getFormPageContent();

  expect(content).toMatch(/UFormField/);
});

test('Uses UInput components', () => {
  const content = getFormPageContent();

  expect(content).toMatch(/UInput/);
});

test('Has email and password fields', () => {
  const content = getFormPageContent();

  expect(content).toMatch(/email/i);
  expect(content).toMatch(/password/i);
});

test('Uses validation schema', () => {
  const content = getFormPageContent();

  // Accept Zod, Yup, or generic schema references
  expect(content).toMatch(/zod|yup|z\.|schema|validate/i);
});

test('Uses useToast for notifications', () => {
  const content = getFormPageContent();

  expect(content).toMatch(/useToast|toast/);
});
