/**
 * Nuxt UI Command Palette
 *
 * Tests whether the agent uses UCommandPalette with the v4 groups structure
 * ({ id, label, items }[]), binds Cmd+K with defineShortcuts, and gives the
 * items something to do. Verified against @nuxt/ui 4.12 / nuxt 4.6.4.
 *
 * Tricky because agents often build custom search/command UI instead
 * of using UCommandPalette, or they add manual keyboard event listeners
 * instead of using Nuxt UI's defineShortcuts composable with meta_k.
 *
 * What is checked, and why:
 * - Every Vue file under app/ is scanned with comments stripped, so the
 *   palette may be extracted into its own component (e.g.
 *   AppCommandPalette.vue), and a comment naming defineShortcuts next to an
 *   addEventListener does not count.
 * - Visibility control accepts v-model:open, :open with @update:open, or
 *   useOverlay() opening an extracted palette modal.
 * - The prompt implies Pages navigate and Actions act, so the five items
 *   need a `to` or an `onSelect` between them. When the palette handles
 *   selection itself with @update:model-value or v-model (documented), only
 *   the three pages need a `to`.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// The palette may be extracted into its own component (e.g. AppCommandPalette.vue),
// which is good practice, so scan every Vue file under app/.
function getAllVueFiles(): string {
  const results: string[] = [];

  function scan(dir: string) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) scan(full);
      else if (entry.name.endsWith('.vue')) {
        results.push(stripComments(readFileSync(full, 'utf-8')));
      }
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

  // Should have the Pages and Actions groups requested in the prompt
  const hasPages = /pages/i.test(content);
  const hasActions = /actions/i.test(content);
  expect(hasPages && hasActions).toBe(true);
});

test('Has visibility control for the palette', () => {
  const content = getAllVueFiles();

  // v-model:open, :open + @update:open, or useOverlay() on a palette modal
  expect(content).toMatch(/v-model:open|:open\s*=|useOverlay/);
});

test('Items navigate or run an action', () => {
  const content = getAllVueFiles();

  // Selection handled on the palette: <UCommandPalette @update:model-value="...">
  const palettes = content.match(/<UCommandPalette\b(?:[^>"']|"[^"]*"|'[^']*')*>/g) ?? [];
  if (palettes.some(tag => /(@|v-on:)update:model-value|v-model(?!:)/.test(tag))) {
    expect((content.match(/\bto\s*:/g) ?? []).length).toBeGreaterThanOrEqual(3);
    return;
  }

  // Home, About, Contact, Toggle theme and Sign out each need a `to` or an onSelect
  const handlers = content.match(/\bto\s*:|onSelect\s*[:(]/g) ?? [];
  expect(handlers.length).toBeGreaterThanOrEqual(5);
});
