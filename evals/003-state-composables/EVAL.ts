/**
 * Nuxt State Management with Composables
 *
 * Tests whether the agent uses useState for global state that persists across
 * navigation, instead of ref() which resets on each page.
 *
 * Tricky because agents default to ref() which doesn't persist across routes.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

test('Shopping cart composable exists', () => {
  const composablesDir = join(process.cwd(), 'app', 'composables');

  expect(existsSync(composablesDir)).toBe(true);

  const files = readdirSync(composablesDir);
  const hasCartComposable = files.some(f => f.toLowerCase().includes('cart'));

  expect(hasCartComposable).toBe(true);
});

test('Composable uses useState for global state', () => {
  const composablesDir = join(process.cwd(), 'app', 'composables');
  const files = readdirSync(composablesDir);
  const cartFile = files.find(f => f.toLowerCase().includes('cart'));

  const content = readFileSync(join(composablesDir, cartFile!), 'utf-8');

  // Must use useState (not just ref) for cross-route persistence
  expect(content).toMatch(/useState/);
});

test('Composable has cart management methods', () => {
  const composablesDir = join(process.cwd(), 'app', 'composables');
  const files = readdirSync(composablesDir);
  const cartFile = files.find(f => f.toLowerCase().includes('cart'));

  const content = readFileSync(join(composablesDir, cartFile!), 'utf-8');

  expect(content).toMatch(/add/i);
  expect(content).toMatch(/remove/i);
  expect(content).toMatch(/clear/i);
});

test('Cart page exists', () => {
  const cartPath = join(process.cwd(), 'app', 'pages', 'cart.vue');

  expect(existsSync(cartPath)).toBe(true);
});

test('Checkout page exists', () => {
  const checkoutPath = join(process.cwd(), 'app', 'pages', 'checkout.vue');

  expect(existsSync(checkoutPath)).toBe(true);
});

test('Pages use the cart composable', () => {
  const cartPath = join(process.cwd(), 'app', 'pages', 'cart.vue');
  const content = readFileSync(cartPath, 'utf-8');

  expect(content).toMatch(/use.*[Cc]art/);
});
