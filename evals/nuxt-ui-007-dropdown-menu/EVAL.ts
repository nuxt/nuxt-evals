/**
 * Nuxt UI Dropdown Menu
 *
 * Tests whether the agent uses UDropdownMenu with the nested array pattern
 * for grouped items, proper item properties (icon, color, onSelect), and
 * a UButton trigger in the default slot.
 *
 * Tricky because agents often build custom popover/menu implementations,
 * forget the nested array pattern for automatic group separators, or skip
 * the color: 'error' property for destructive items.
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
    join(process.cwd(), 'app', 'app.vue'),
  );

  expect(pagePath).toBeDefined();
});

test('Uses UDropdownMenu component', () => {
  const content = getPageContent();

  expect(content).toMatch(/UDropdownMenu/);
});

test('Dropdown has :items prop', () => {
  const content = getPageContent();

  // Should use :items prop to pass menu items
  expect(content).toMatch(/:items/);
});

test('Uses nested array pattern for grouped items', () => {
  const content = getPageContent();

  // Nested array pattern: items should be typed as DropdownMenuItem[][]
  // or structured as [[...], [...]] for automatic separators
  // Look for array of arrays pattern or the type annotation
  const hasNestedArrayType = /DropdownMenuItem\s*\[\]\[\]/.test(content);
  const hasNestedArrayLiteral = /\[\s*\[/.test(content);
  const hasSeparatorType = /type\s*:\s*['"]separator['"]/.test(content);

  expect(hasNestedArrayType || hasNestedArrayLiteral || hasSeparatorType).toBe(true);
});

test('Items have labels and icons', () => {
  const content = getPageContent();

  expect(content).toMatch(/label\s*:/);
  expect(content).toMatch(/icon\s*:/);
});

test('Has destructive item with error color', () => {
  const content = getPageContent();

  // Should have a delete/destructive item with color: 'error'
  expect(content).toMatch(/color\s*:\s*['"]error['"]/);
});

test('Has onSelect handler', () => {
  const content = getPageContent();

  // Should use onSelect callback on at least one item
  expect(content).toMatch(/onSelect/);
});

test('Uses UButton as trigger', () => {
  const content = getPageContent();

  // UButton should be in the default slot of UDropdownMenu as the trigger
  expect(content).toMatch(/UButton/);
});

test('Does not use native dropdown elements', () => {
  const content = getPageContent();

  // Should NOT use native <select>, <details>, or custom dropdown implementations
  expect(content).not.toMatch(/<select[\s>]/);
  expect(content).not.toMatch(/<details[\s>]/);
});
