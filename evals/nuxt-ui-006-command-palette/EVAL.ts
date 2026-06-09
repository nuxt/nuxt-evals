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
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

// The palette may be extracted into its own component (e.g. AppCommandPalette.vue),
// which is good practice — so scan every Vue file under app/.
function getAllVueFiles(): string {
  const results: string[] = [];

  function scan(dir: string) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) scan(full);
      else if (entry.name.endsWith('.vue')) results.push(readFileSync(full, 'utf-8'));
    }
  }

  scan(join(process.cwd(), 'app'));
  return results.join('\n');
}

test('Page exists', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();
});

test('Uses UCommandPalette component', () => {
  const content = getAllVueFiles();

  expect(content).toMatch(/UCommandPalette/);
});

test('Command palette uses :groups prop', () => {
  const content = getAllVueFiles();

  // v4 pattern: <UCommandPalette :groups="groups" />
  expect(content).toMatch(/:groups/);
});

test('Groups have proper structure with id and items', () => {
  const content = getAllVueFiles();

  // Groups should have id and items properties
  expect(content).toMatch(/id\s*:/);
  expect(content).toMatch(/items\s*:/);
});

test('Uses defineShortcuts for Cmd+K binding', () => {
  const content = getAllVueFiles();

  // Should use Nuxt UI's defineShortcuts composable (not addEventListener)
  expect(content).toMatch(/defineShortcuts/);
  expect(content).toMatch(/meta_k/);
});

test('Items have labels and icons', () => {
  const content = getAllVueFiles();

  expect(content).toMatch(/label\s*:/);
  expect(content).toMatch(/icon\s*:/);
});

test('Has multiple groups', () => {
  const content = getAllVueFiles();

  // Should have at least 2 groups (Pages and Actions as requested)
  // Groups are objects with both id and items properties
  // Check for multiple group-like structures or array of groups
  const hasPages = /pages|Pages/i.test(content);
  const hasActions = /actions|Actions/i.test(content);
  expect(hasPages && hasActions).toBe(true);
});

test('Has visibility control for the palette', () => {
  const content = getAllVueFiles();

  // Should use v-model:open for reactive visibility control
  expect(content).toMatch(/v-model:open/);
});
