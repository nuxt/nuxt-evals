/**
 * Nuxt State Management with Composables
 *
 * Tests whether the agent uses useState for global state that persists across
 * navigation, instead of ref() which resets on each page (and leaks across
 * requests on the server). The shared state must be consumed in at least three
 * places (cart, checkout, and a persistent header/products consumer) to prove
 * it actually persists across routes.
 *
 * Tricky because agents default to ref() which doesn't persist across routes,
 * or wire the cart into a single page so persistence is never exercised.
 */

import { expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function findFile(...paths: string[]): string | undefined {
  return paths.find(p => existsSync(p));
}

function collectVueFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectVueFiles(full));
    else if (entry.endsWith('.vue')) out.push(full);
  }
  return out;
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

test('Composable does not use plain ref for cart state', () => {
  const content = getCartComposableContent();

  // ref() does not persist across route navigations and leaks across requests
  // on the server — useState is required for the cart store.
  const usesRefForState = /(?:const|let)\s+(?:cart|items|state|store)\s*=\s*ref\s*\(/i.test(content);
  expect(usesRefForState).toBe(false);
});

test('Composable has cart management methods', () => {
  const content = getCartComposableContent();

  expect(content).toMatch(/add/i);
  expect(content).toMatch(/remove/i);
  expect(content).toMatch(/clear/i);
});

test('Composable derives total/count via computed and returns its API', () => {
  const content = getCartComposableContent();

  // Totals must be derived reactively via computed(), not recalculated by hand.
  expect(content).toMatch(/computed\s*\(/);
  // A composable has to return its state/methods to be usable elsewhere.
  expect(content).toMatch(/\breturn\b/);
});

test('Cart page exists', () => {
  expect(findFile(join(process.cwd(), 'app', 'pages', 'cart.vue'))).toBeDefined();
});

test('Checkout page exists', () => {
  expect(findFile(join(process.cwd(), 'app', 'pages', 'checkout.vue'))).toBeDefined();
});

test('Cart page uses the cart composable', () => {
  const cartPath = findFile(join(process.cwd(), 'app', 'pages', 'cart.vue'))!;
  expect(readFileSync(cartPath, 'utf-8')).toMatch(/useCart\s*\(/);
});

test('Checkout page uses the cart composable', () => {
  const checkoutPath = findFile(join(process.cwd(), 'app', 'pages', 'checkout.vue'))!;
  // Checkout must also use the shared cart composable for state to persist
  expect(readFileSync(checkoutPath, 'utf-8')).toMatch(/useCart\s*\(/);
});

test('Shared cart state is consumed in at least three places', () => {
  const files = collectVueFiles(join(process.cwd(), 'app'));
  const consumers = files.filter(f => /useCart\s*\(/.test(readFileSync(f, 'utf-8')));

  // cart + checkout + a third consumer (e.g. a persistent header badge or the
  // products page) proves the state genuinely persists across navigation.
  expect(consumers.length).toBeGreaterThanOrEqual(3);
});
