/**
 * Nuxt UI Modal
 *
 * Tests whether the agent uses UModal with a title prop, the
 * named body and footer slots, and a real way to open and close it.
 * Verified against @nuxt/ui 4.12 / nuxt 4.6.4.
 *
 * Tricky because agents might use v-if/v-show for visibility instead of
 * UModal's own open state, or skip the proper slot structure. Some agents
 * also build custom dialog components instead of using UModal.
 *
 * What is checked, and why:
 * - Every Vue file under app/ is scanned with comments stripped, so the modal
 *   may be extracted into its own component, and a commented-out UModal does
 *   not count.
 * - Visibility control accepts every documented pattern: v-model:open,
 *   :open with @update:open, useOverlay() on an extracted modal, or the
 *   uncontrolled form from the docs, where the trigger sits in the default
 *   slot and the buttons call the `close` slot prop (#footer="{ close }").
 * - Slots may be written as #body or v-slot:body.
 * - Saving must add the item to the list, so a Save button that only closes
 *   the modal fails.
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

// The modal may live in the page or an extracted component, so scan every Vue
// file under app/ so a correct placement is never missed.
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

test('Uses UModal component', () => {
  const content = getAllVueFiles();

  expect(content).toMatch(/UModal/);
});

test('Modal visibility uses its open state, useOverlay or the close slot prop', () => {
  const content = getAllVueFiles();

  // v-model:open, :open + @update:open, useOverlay(), or the uncontrolled
  // pattern closing through the slot prop: <template #footer="{ close }">
  expect(content).toMatch(
    /v-model:open|:open\s*=|useOverlay|(#|v-slot:)(footer|body|content)="\{[^}]*\bclose\b/,
  );
});

test('Modal has title', () => {
  const content = getAllVueFiles();

  // Title must be wired as a prop or slot, not just the word appearing.
  expect(content).toMatch(/:?title\s*=|(#|v-slot:)(title|header)/);
});

test('Modal has body slot with form', () => {
  const content = getAllVueFiles();

  expect(content).toMatch(/(#|v-slot:)body/);
});

test('Modal has footer slot with action buttons', () => {
  const content = getAllVueFiles();

  expect(content).toMatch(/(#|v-slot:)footer/);
});

test('Has UButton to trigger the modal', () => {
  const content = getAllVueFiles();

  expect(content).toMatch(/UButton/);
});

test('Modal contains form inputs', () => {
  const content = getAllVueFiles();

  // Should have UInput or UFormField inside the modal
  expect(content).toMatch(/UInput|UFormField/);
});

test('Does not use native dialog or custom modal', () => {
  const content = getAllVueFiles();

  expect(content).not.toMatch(/<dialog[\s>]/);
});

test('Has a list of items displayed', () => {
  const content = getAllVueFiles();

  expect(content).toMatch(/v-for/);
});

test('Has Cancel and Save buttons in the modal', () => {
  const content = getAllVueFiles();

  expect(content).toMatch(/[Cc]ancel/);
  expect(content).toMatch(/[Ss]ave|[Aa]dd|[Ss]ubmit/);
});

test('Saving adds the item to the list', () => {
  const content = getAllVueFiles();

  // push, unshift or splice, a new array with a spread (appended or prepended,
  // e.g. items.value = [item, ...items.value]), or concat
  expect(content).toMatch(/\.(push|unshift|splice)\(|\.value\s*=\s*\[[^\]]*\.\.\.|\.concat\(/);
});
