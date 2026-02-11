/**
 * Nuxt UI Modal
 *
 * Tests whether the agent uses UModal with proper v-model:open binding,
 * title/description props, and named slots (body, footer).
 *
 * Tricky because agents might use v-if/v-show for visibility instead of
 * UModal's v-model:open, or skip the proper slot structure. Some agents
 * also build custom dialog components instead of using UModal.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function getPageContent(): string {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  if (!pagePath) {
    throw new Error('No page found');
  }

  return readFileSync(pagePath, 'utf-8');
}

test('Page exists', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();
});

test('Uses UModal component', () => {
  const content = getPageContent();

  expect(content).toMatch(/UModal/);
});

test('Modal uses v-model:open for visibility', () => {
  const content = getPageContent();

  // Should use v-model:open (not v-if or v-show)
  expect(content).toMatch(/v-model:open/);
});

test('Modal has title', () => {
  const content = getPageContent();

  // Should have title prop or slot content
  expect(content).toMatch(/title/);
});

test('Modal has body slot with form', () => {
  const content = getPageContent();

  // Should have #body slot
  expect(content).toMatch(/#body/);
});

test('Modal has footer slot with action buttons', () => {
  const content = getPageContent();

  // Should have #footer slot with buttons
  expect(content).toMatch(/#footer/);
});

test('Has UButton to trigger the modal', () => {
  const content = getPageContent();

  // Should have a button to open the modal
  expect(content).toMatch(/UButton/);
});

test('Modal contains form inputs', () => {
  const content = getPageContent();

  // Should have UInput or UFormField inside the modal
  expect(content).toMatch(/UInput|UFormField/);
});

test('Does not use native dialog or custom modal', () => {
  const content = getPageContent();

  // Should NOT use native <dialog> element
  expect(content).not.toMatch(/<dialog[\s>]/);
});
