/**
 * Nuxt Components (Auto-Import)
 *
 * Tests whether the agent creates components in the correct directory
 * and relies on Nuxt's auto-import instead of manual import statements.
 *
 * Tricky because agents often add explicit import statements for components
 * that live in the components/ directory, which Nuxt auto-imports. They also
 * sometimes place components in wrong directories or use incorrect naming.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

test('Components directory exists', () => {
  const componentsDir = findFile(
    join(process.cwd(), 'app', 'components'),
    join(process.cwd(), 'components'),
  );

  expect(componentsDir).toBeDefined();
});

test('AppCard component exists', () => {
  const componentsDir = findFile(
    join(process.cwd(), 'app', 'components'),
    join(process.cwd(), 'components'),
  );

  const files = readdirSync(componentsDir!);
  const hasCard = files.some(f => f.toLowerCase().includes('card') || f.toLowerCase().includes('Card'));

  expect(hasCard).toBe(true);
});

test('Component uses defineProps for props', () => {
  const componentsDir = findFile(
    join(process.cwd(), 'app', 'components'),
    join(process.cwd(), 'components'),
  );

  const files = readdirSync(componentsDir!);
  const cardFile = files.find(f => f.toLowerCase().includes('card'));

  const content = readFileSync(join(componentsDir!, cardFile!), 'utf-8');

  expect(content).toMatch(/defineProps/);
});

test('Component accepts title and description props', () => {
  const componentsDir = findFile(
    join(process.cwd(), 'app', 'components'),
    join(process.cwd(), 'components'),
  );

  const files = readdirSync(componentsDir!);
  const cardFile = files.find(f => f.toLowerCase().includes('card'));

  const content = readFileSync(join(componentsDir!, cardFile!), 'utf-8');

  expect(content).toMatch(/title/);
  expect(content).toMatch(/description/);
});

test('Homepage uses the card component', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();

  const content = readFileSync(pagePath!, 'utf-8');

  // Should reference the card component in template
  expect(content).toMatch(/Card|card/);
});

test('Homepage does NOT manually import the component', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  const content = readFileSync(pagePath!, 'utf-8');

  // Nuxt auto-imports components from components/ — no manual import needed
  expect(content).not.toMatch(/import\s+.*Card.*from\s+['"].*components/);
});

test('Homepage displays multiple card instances', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  const content = readFileSync(pagePath!, 'utf-8');

  // Should have multiple card usages (v-for or repeated components)
  const hasVFor = /v-for/.test(content);
  const cardMatches = content.match(/<(App)?Card|<app-card/gi);
  const hasMultiple = hasVFor || (cardMatches && cardMatches.length >= 3);

  expect(hasMultiple).toBe(true);
});
