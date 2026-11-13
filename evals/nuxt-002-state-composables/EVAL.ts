/**
 * Nuxt State Management with Composables
 *
 * Tests whether the agent builds the cart on useState, which Nuxt shares across
 * components and serialises from server to client, inside a `useCart()`
 * composable in app/composables/. The composable must not hold cart data in
 * ref()/shallowRef()/reactive(): at module scope that state is shared across
 * requests on the server (the Nuxt state management docs warn against it), and
 * inside the function it resets for every consumer. Verified on nuxt 4.6.4.
 *
 * The shared state must be consumed in at least three places (cart, checkout
 * and a third consumer), and at least once outside app/pages/ (app.vue, a
 * layout or a header component), because the prompt asks for the item count
 * in a persistent header on every page.
 *
 * Tricky because agents default to ref(), which does not survive SSR, or wire
 * the cart into the pages only. Composable checks run on comment-stripped
 * source, so naming useState in a comment scores nothing.
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

function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// useCart() has to be called from a <script> block. The starter's cart page
// mentions `useCart()` in its placeholder text, which must not count.
function callsUseCart(file: string): boolean {
  const scripts = stripComments(readFileSync(file, 'utf-8')).match(/<script[\s\S]*?<\/script>/g) ?? [];
  return scripts.some(block => /useCart\s*\(/.test(block));
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
  const cartFile = files.find(f => f.toLowerCase().includes('cart') && statSync(join(dir, f)).isFile());

  if (!cartFile) {
    throw new Error('No cart composable found');
  }

  return stripComments(readFileSync(join(dir, cartFile), 'utf-8'));
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
  expect(content).toMatch(/useState\s*(?:<[\s\S]*?>)?\s*\(/);
});

test('Composable does not use plain ref for cart state', () => {
  const content = getCartComposableContent();

  // Any ref/reactive holding cart data, typed or not, either leaks across
  // requests (module scope) or resets for every consumer (inside useCart).
  expect(content).not.toMatch(/\b(?:ref|shallowRef|reactive)\s*(?:<[\s\S]*?>)?\s*\(/);
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
  expect(callsUseCart(cartPath)).toBe(true);
});

test('Checkout page uses the cart composable', () => {
  const checkoutPath = findFile(join(process.cwd(), 'app', 'pages', 'checkout.vue'))!;
  // Checkout must also use the shared cart composable for state to persist
  expect(callsUseCart(checkoutPath)).toBe(true);
});

test('Cart count is shown outside the pages (persistent header)', () => {
  const files = collectVueFiles(join(process.cwd(), 'app'))
    .filter(f => !f.startsWith(join(process.cwd(), 'app', 'pages')));
  const consumers = files.filter(callsUseCart);

  // app.vue, a layout or a header component: the prompt asks for a header on every page.
  expect(consumers.length).toBeGreaterThanOrEqual(1);
});

test('Shared cart state is consumed in at least three places', () => {
  const files = collectVueFiles(join(process.cwd(), 'app'));
  const consumers = files.filter(callsUseCart);

  // cart + checkout + a third consumer (e.g. a persistent header badge or the
  // products page) proves the state genuinely persists across navigation.
  expect(consumers.length).toBeGreaterThanOrEqual(3);
});
