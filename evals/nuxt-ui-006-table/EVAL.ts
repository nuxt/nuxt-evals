/**
 * Nuxt UI Table
 *
 * Tests whether the agent uses UTable with proper column definitions
 * and the :data prop instead of building a custom HTML table.
 *
 * Tricky because agents often use native <table> elements, build custom
 * table components, or use wrong prop names like :rows or :items instead
 * of v4's :data prop.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function getPageContent(): string {
  const candidates = [
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'pages', 'users.vue'),
    join(process.cwd(), 'pages', 'users.vue'),
    join(process.cwd(), 'app', 'pages', 'users', 'index.vue'),
    join(process.cwd(), 'pages', 'users', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      const content = readFileSync(candidate, 'utf-8');
      if (content.includes('UTable')) return content;
    }
  }

  const pagePath = findFile(...candidates);
  if (!pagePath) {
    throw new Error('No page found');
  }

  return readFileSync(pagePath, 'utf-8');
}

test('Page exists', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'pages', 'users.vue'),
    join(process.cwd(), 'pages', 'users.vue'),
    join(process.cwd(), 'app', 'pages', 'users', 'index.vue'),
    join(process.cwd(), 'pages', 'users', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();
});

test('Uses UTable component', () => {
  const content = getPageContent();

  expect(content).toMatch(/<UTable/);
});

test('UTable uses :data prop', () => {
  const content = getPageContent();

  // v4 pattern: <UTable :data="users" :columns="columns" />
  // :data is the correct prop (not :rows or :items)
  expect(content).toMatch(/:data/);
});

test('UTable uses :columns prop', () => {
  const content = getPageContent();

  // columns defines the table structure
  expect(content).toMatch(/:columns/);
});

test('Does not use native table elements', () => {
  const content = getPageContent();

  // Should NOT use raw <table>, <tr>, <td> elements
  expect(content).not.toMatch(/<table[\s>]/);
  expect(content).not.toMatch(/<tr[\s>]/);
});

test('Has user data with required fields', () => {
  const content = getPageContent();

  // Should have name, email, and role data
  expect(content).toMatch(/name/i);
  expect(content).toMatch(/email/i);
  expect(content).toMatch(/role/i);
});

test('Has at least 5 data items', () => {
  const content = getPageContent();

  // Count email-like patterns (user@domain.tld) to verify sufficient data rows
  const emailMatches = content.match(/[\w.-]+@[\w.-]+\.\w+/g);
  expect(emailMatches && emailMatches.length >= 5).toBe(true);
});

test('Has search/filter functionality with UInput', () => {
  const content = getPageContent();

  // Should have UInput for search
  expect(content).toMatch(/UInput/);
  expect(content).toMatch(/search|filter|query/i);
});
