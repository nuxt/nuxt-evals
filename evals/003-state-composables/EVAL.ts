/**
 * Nuxt State Management with Composables
 *
 * Tests whether the agent can create a shopping cart composable using useState
 * for global state. Agents often use ref() instead of useState() which breaks
 * state persistence across navigation.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

test('useShoppingCart composable exists', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'composables', 'useShoppingCart.ts'),
    join(rootDir, 'app', 'composables', 'useShoppingCart.js'),
    join(rootDir, 'composables', 'useShoppingCart.ts'),
    join(rootDir, 'composables', 'useShoppingCart.js'),
  ];

  const exists = possiblePaths.some((p) => existsSync(p));
  expect(exists).toBe(true);
});

test('Composable uses useState for global state', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'composables', 'useShoppingCart.ts'),
    join(rootDir, 'app', 'composables', 'useShoppingCart.js'),
    join(rootDir, 'composables', 'useShoppingCart.ts'),
    join(rootDir, 'composables', 'useShoppingCart.js'),
  ];

  const composablePath = possiblePaths.find((p) => existsSync(p));

  if (composablePath) {
    const content = readFileSync(composablePath, 'utf-8');

    // Should use useState (not just ref)
    expect(content).toMatch(/useState/);
  }
});

test('Composable implements required methods', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'composables', 'useShoppingCart.ts'),
    join(rootDir, 'app', 'composables', 'useShoppingCart.js'),
    join(rootDir, 'composables', 'useShoppingCart.ts'),
    join(rootDir, 'composables', 'useShoppingCart.js'),
  ];

  const composablePath = possiblePaths.find((p) => existsSync(p));

  if (composablePath) {
    const content = readFileSync(composablePath, 'utf-8');

    // Should have addItem, removeItem, clearCart methods
    expect(content).toMatch(/addItem/);
    expect(content).toMatch(/removeItem/);
    expect(content).toMatch(/clearCart/);
  }
});

test('Cart page exists', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'cart.vue'),
    join(rootDir, 'app', 'pages', 'cart', 'index.vue'),
    join(rootDir, 'pages', 'cart.vue'),
    join(rootDir, 'pages', 'cart', 'index.vue'),
  ];

  const exists = possiblePaths.some((p) => existsSync(p));
  expect(exists).toBe(true);
});

test('Checkout page exists', () => {
  const rootDir = process.cwd();

  const possiblePaths = [
    join(rootDir, 'app', 'pages', 'checkout.vue'),
    join(rootDir, 'app', 'pages', 'checkout', 'index.vue'),
    join(rootDir, 'pages', 'checkout.vue'),
    join(rootDir, 'pages', 'checkout', 'index.vue'),
  ];

  const exists = possiblePaths.some((p) => existsSync(p));
  expect(exists).toBe(true);
});

test('Pages use the shopping cart composable', () => {
  const rootDir = process.cwd();

  const pagePaths = [
    join(rootDir, 'app', 'pages', 'cart.vue'),
    join(rootDir, 'app', 'pages', 'cart', 'index.vue'),
    join(rootDir, 'app', 'pages', 'checkout.vue'),
    join(rootDir, 'app', 'pages', 'checkout', 'index.vue'),
  ];

  let foundUsage = false;

  for (const path of pagePaths) {
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf-8');
      if (content.includes('useShoppingCart')) {
        foundUsage = true;
        break;
      }
    }
  }

  expect(foundUsage).toBe(true);
});
