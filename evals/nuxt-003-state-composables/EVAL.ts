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

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function getComposablesDir(): string {
  const dir = join(process.cwd(), 'app', 'composables');

  if (!existsSync(dir)) {
    throw new Error('No composables directory found');
  }

  return dir;
}

function getCartComposableContent(): string {
  const dir = getComposablesDir();
  const files = readdirSync(dir);
  const cartFile = files.find(f => f.toLowerCase().includes('cart'));

  if (!cartFile) {
    throw new Error('No cart composable found');
  }

  return readFileSync(join(dir, cartFile), 'utf-8');
}

test('Shopping cart composable exists', () => {
  const dir = getComposablesDir();
  const files = readdirSync(dir);
  const hasCartComposable = files.some(f => f.toLowerCase().includes('cart'));

  expect(hasCartComposable).toBe(true);
});

test('Composable uses useState for global state', () => {
  const content = getCartComposableContent();

  // Must use useState (not just ref) for cross-route persistence
  expect(content).toMatch(/useState/);
});

test('Composable has cart management methods', () => {
  const content = getCartComposableContent();

  expect(content).toMatch(/add/i);
  expect(content).toMatch(/remove/i);
  expect(content).toMatch(/clear/i);
});

test('Cart page exists', () => {
  const cartPath = findFile(
    join(process.cwd(), 'app', 'pages', 'cart.vue'),
  );

  expect(cartPath).toBeDefined();
});

test('Checkout page exists', () => {
  const checkoutPath = findFile(
    join(process.cwd(), 'app', 'pages', 'checkout.vue'),
  );

  expect(checkoutPath).toBeDefined();
});

test('Pages use the cart composable', () => {
  const cartPath = findFile(
    join(process.cwd(), 'app', 'pages', 'cart.vue'),
  );

  expect(cartPath).toBeDefined();

  const content = readFileSync(cartPath!, 'utf-8');

  expect(content).toMatch(/use.*[Cc]art/);
});
