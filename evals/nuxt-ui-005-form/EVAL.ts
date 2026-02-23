/**
 * Nuxt UI Form with Validation
 *
 * Tests whether the agent uses Nuxt UI v4 form components correctly with
 * Standard Schema validation (Zod, Valibot, Yup) and toast notifications.
 *
 * Tricky because agents might use native form elements instead of UForm,
 * skip the :schema/:state props pattern, or use v-model on UForm instead
 * of reactive() state with :state binding.
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
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'pages', 'login.vue'),
    join(process.cwd(), 'pages', 'login.vue'),
    join(process.cwd(), 'app', 'pages', 'login', 'index.vue'),
    join(process.cwd(), 'pages', 'login', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      const content = readFileSync(candidate, 'utf-8');
      if (content.includes('UForm')) return content;
    }
  }

  const pagePath = findFile(...candidates);
  if (!pagePath) {
    throw new Error('No form page found');
  }

  return readFileSync(pagePath, 'utf-8');
}

test('Form page exists', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'pages', 'login.vue'),
    join(process.cwd(), 'pages', 'login.vue'),
    join(process.cwd(), 'app', 'pages', 'login', 'index.vue'),
    join(process.cwd(), 'pages', 'login', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();
});

test('Uses UForm component', () => {
  const content = getFormPageContent();

  expect(content).toMatch(/<UForm/);
});

test('UForm has :schema and :state bindings', () => {
  const content = getFormPageContent();

  // v4 pattern: <UForm :schema="schema" :state="state" @submit="onSubmit">
  expect(content).toMatch(/:schema/);
  expect(content).toMatch(/:state/);
});

test('UForm has @submit handler', () => {
  const content = getFormPageContent();

  // UForm validates before emitting @submit — state is valid inside handler
  expect(content).toMatch(/@submit/);
});

test('Uses UFormField for form fields', () => {
  const content = getFormPageContent();

  expect(content).toMatch(/UFormField/);
});

test('UFormField has name prop', () => {
  const content = getFormPageContent();

  // name prop is required for validation to work with UFormField
  expect(content).toMatch(/UFormField[\s\S]*?name=/);
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

test('Uses validation schema (Zod, Valibot, or Yup)', () => {
  const content = getFormPageContent();

  // Standard Schema: Zod (z.object), Valibot (v.object), Yup (yup.object)
  expect(content).toMatch(/z\.\s*object|v\.\s*object|yup\.\s*object|schema/i);
});

test('Uses reactive state', () => {
  const content = getFormPageContent();

  // v4 best practice: reactive<Partial<Schema>>({ ... })
  expect(content).toMatch(/reactive/);
});

test('Uses useToast for notifications', () => {
  const content = getFormPageContent();

  expect(content).toMatch(/useToast|toast/);
});
