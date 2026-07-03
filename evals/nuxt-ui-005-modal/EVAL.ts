/**
 * Nuxt UI Modal
 *
 * Tests whether the agent uses UModal with proper open-state control,
 * title/description props, and named slots (body, footer).
 *
 * Tricky because agents might use v-if/v-show for visibility instead of
 * UModal's v-model:open, or skip the proper slot structure. Some agents
 * also build custom dialog components instead of using UModal.
 *
 * The modal may be extracted into its own component and opened with
 * useOverlay() — the documented programmatic pattern — so every Vue file
 * under app/ is scanned, and useOverlay counts as valid visibility control.
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

// The modal may live in the page or an extracted component — scan every Vue
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

test('Modal visibility uses v-model:open or useOverlay', () => {
  const content = getAllVueFiles();

  // Should use v-model:open or the programmatic useOverlay pattern
  // (not v-if or v-show around the modal).
  expect(content).toMatch(/v-model:open|useOverlay/);
});

test('Modal has title', () => {
  const content = getAllVueFiles();

  // Title must be wired as a prop or slot, not just the word appearing.
  expect(content).toMatch(/:?title\s*=|#title|#header/);
});

test('Modal has body slot with form', () => {
  const content = getAllVueFiles();

  // Should have #body slot
  expect(content).toMatch(/#body/);
});

test('Modal has footer slot with action buttons', () => {
  const content = getAllVueFiles();

  // Should have #footer slot with buttons
  expect(content).toMatch(/#footer/);
});

test('Has UButton to trigger the modal', () => {
  const content = getAllVueFiles();

  // Should have a button to open the modal
  expect(content).toMatch(/UButton/);
});

test('Modal contains form inputs', () => {
  const content = getAllVueFiles();

  // Should have UInput or UFormField inside the modal
  expect(content).toMatch(/UInput|UFormField/);
});

test('Does not use native dialog or custom modal', () => {
  const content = getAllVueFiles();

  // Should NOT use native <dialog> element
  expect(content).not.toMatch(/<dialog[\s>]/);
});

test('Has a list of items displayed', () => {
  const content = getAllVueFiles();

  // Should display a list of items with v-for
  expect(content).toMatch(/v-for/);
});

test('Has Cancel and Save buttons in the modal', () => {
  const content = getAllVueFiles();

  // Should have Cancel and Save (or similar) action buttons
  expect(content).toMatch(/[Cc]ancel/);
  expect(content).toMatch(/[Ss]ave|[Aa]dd|[Ss]ubmit/);
});
