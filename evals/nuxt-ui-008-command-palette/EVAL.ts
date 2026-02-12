/**
 * Nuxt UI Command Palette
 *
 * Tests whether the agent uses UCommandPalette with proper groups structure
 * ({ id, label, items }[]) and defineShortcuts for keyboard binding.
 *
 * Tricky because agents often build custom search/command UI instead
 * of using UCommandPalette, or they add manual keyboard event listeners
 * instead of using Nuxt UI's defineShortcuts composable with meta_k.
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

test('Uses UCommandPalette component', () => {
  const content = getPageContent();

  expect(content).toMatch(/UCommandPalette/);
});

test('Command palette uses :groups prop', () => {
  const content = getPageContent();

  // v4 pattern: <UCommandPalette :groups="groups" />
  expect(content).toMatch(/:groups/);
});

test('Groups have proper structure with id and items', () => {
  const content = getPageContent();

  // Groups should have id and items properties
  expect(content).toMatch(/id\s*:/);
  expect(content).toMatch(/items\s*:/);
});

test('Uses defineShortcuts for Cmd+K binding', () => {
  const content = getPageContent();

  // Should use Nuxt UI's defineShortcuts composable (not addEventListener)
  expect(content).toMatch(/defineShortcuts/);
  expect(content).toMatch(/meta_k/);
});

test('Items have labels and icons', () => {
  const content = getPageContent();

  expect(content).toMatch(/label\s*:/);
  expect(content).toMatch(/icon\s*:/);
});

test('Has multiple groups', () => {
  const content = getPageContent();

  // Should have at least 2 groups (Pages and Actions as requested)
  const groupIdMatches = content.match(/id\s*:\s*['"][^'"]+['"]/g);
  expect(groupIdMatches && groupIdMatches.length >= 2).toBe(true);
});

test('Uses v-model:open for visibility control', () => {
  const content = getPageContent();

  // v4 pattern: v-model:open (not v-if or v-show)
  expect(content).toMatch(/v-model:open/);
});
