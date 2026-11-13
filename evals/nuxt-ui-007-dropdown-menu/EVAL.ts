/**
 * Nuxt UI Dropdown Menu
 *
 * Tests whether the agent uses UDropdownMenu with grouped items (nested
 * arrays or separator items), icons on every item, and a destructive Delete
 * item carrying color: 'error' and an onSelect that logs. Verified against
 * @nuxt/ui 4.12 / nuxt 4.6.4.
 *
 * Tricky because agents often build custom popover/menu implementations,
 * forget the nested array pattern for automatic group separators, use the
 * v2 `click` key instead of onSelect, or skip the color: 'error' property
 * for destructive items.
 *
 * What is checked, and why:
 * - Every Vue file under app/ is scanned with comments stripped, so the card
 *   may be extracted into a component or live on any page, and a
 *   commented-out menu does not count.
 * - color: 'error', the icon and onSelect are checked on the object literal
 *   that holds the Delete label, not anywhere in the file. Putting them on
 *   Edit while Delete stays plain fails.
 * - The handler may be inline or a named function, so console usage is
 *   checked across the files.
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

// The { ... } object literal enclosing the first match of `needle`.
function enclosingObject(source: string, needle: RegExp): string | undefined {
  const match = needle.exec(source);
  if (!match) return;

  let depth = 0;
  let start = -1;
  for (let i = match.index; i >= 0; i--) {
    if (source[i] === '}') depth++;
    else if (source[i] === '{') {
      if (depth === 0) {
        start = i;
        break;
      }
      depth--;
    }
  }
  if (start < 0) return;

  depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
}

test('Page exists', () => {
  const pagePath = findFile(
    join(process.cwd(), 'app', 'pages', 'index.vue'),
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();
});

test('Uses UDropdownMenu component', () => {
  const content = getAllVueFiles();

  expect(content).toMatch(/UDropdownMenu/);
});

test('Dropdown has :items prop', () => {
  const content = getAllVueFiles();

  expect(content).toMatch(/:items/);
});

test('Uses nested array pattern for grouped items', () => {
  const content = getAllVueFiles();

  // DropdownMenuItem[][], a [[...], [...]] literal, or { type: 'separator' } items
  const hasNestedArrayType = /DropdownMenuItem\s*\[\]\[\]/.test(content);
  const hasNestedArrayLiteral = /\[\s*\[/.test(content);
  const hasSeparatorType = /type\s*:\s*['"]separator['"]/.test(content);

  expect(hasNestedArrayType || hasNestedArrayLiteral || hasSeparatorType).toBe(true);
});

test('Items have labels and icons', () => {
  const content = getAllVueFiles();

  // Edit, Duplicate and Delete each need an icon
  expect(content).toMatch(/label\s*:/);
  expect((content.match(/icon\s*:/g) ?? []).length).toBeGreaterThanOrEqual(3);
});

test('Delete item has error color, icon and onSelect', () => {
  const item = enclosingObject(getAllVueFiles(), /label\s*:\s*['"`]Delete/);

  expect(item, 'object literal with label: \'Delete\'').toBeDefined();
  expect(item).toMatch(/color\s*:\s*['"]error['"]/);
  expect(item).toMatch(/icon\s*:/);
  expect(item).toMatch(/onSelect/);
});

test('Delete handler logs to the console', () => {
  const content = getAllVueFiles();

  expect(content).toMatch(/console\.(log|info|warn)\(/);
});

test('Uses UButton as trigger', () => {
  const content = getAllVueFiles();

  // UButton should be in the default slot of UDropdownMenu as the trigger
  expect(content).toMatch(/UButton/);
});

test('Does not use native dropdown elements', () => {
  const content = getAllVueFiles();

  expect(content).not.toMatch(/<select[\s>]/);
  expect(content).not.toMatch(/<details[\s>]/);
});
