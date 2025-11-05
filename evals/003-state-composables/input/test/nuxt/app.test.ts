import { expect, test } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const COMPOSABLES_DIR = join(process.cwd(), 'app', 'composables')
const PAGES_DIR = join(process.cwd(), 'app', 'pages')

const POSSIBLE_COMPOSABLE_PATHS = [
  join(COMPOSABLES_DIR, 'useShoppingCart.ts'),
  join(COMPOSABLES_DIR, 'useCart.ts'),
  join(COMPOSABLES_DIR, 'shopping-cart.ts'),
  join(COMPOSABLES_DIR, 'cart.ts')
]

const PAGE_PATHS = {
  index: join(PAGES_DIR, 'index.vue'),
  cart: join(PAGES_DIR, 'cart.vue'),
  checkout: join(PAGES_DIR, 'checkout.vue')
}

const CART_USAGE_PATTERNS = ['useShoppingCart', 'useCart', 'shoppingCart', 'cart']

test('composables directory exists', () => {
  expect(existsSync(COMPOSABLES_DIR)).toBe(true)
})

test('composable exists, uses useState and exports use* function', () => {
  const composablePath = POSSIBLE_COMPOSABLE_PATHS.find(path => existsSync(path))
  expect(composablePath).toBeDefined()

  const content = readFileSync(composablePath!, 'utf-8')
  // Should use useState for global state
  expect(content.includes('useState')).toBe(true)

  // Should export a composable starting with "use" (Vue convention)
  const hasUseComposable = content.includes('useShoppingCart') ||
                          content.includes('useCart') ||
                          content.includes('export function use') ||
                          content.includes('export const use')
  expect(hasUseComposable).toBe(true)

  // Should have cart management methods
  const hasCartMethods = content.includes('addItem') || content.includes('add')
  expect(hasCartMethods).toBe(true)
})

test('composable has all required cart methods', () => {
  const composablePath = POSSIBLE_COMPOSABLE_PATHS.find(path => existsSync(path))
  expect(composablePath).toBeDefined()

  const content = readFileSync(composablePath!, 'utf-8')
  const contentLower = content.toLowerCase()

  // Should have all required methods
  expect(contentLower.includes('additem') || contentLower.includes('add')).toBe(true)
  expect(contentLower.includes('removeitem') || contentLower.includes('remove')).toBe(true)
  expect(contentLower.includes('clearcart') || contentLower.includes('clear')).toBe(true)
})

test('pages directory exists', () => {
  expect(existsSync(PAGES_DIR)).toBe(true)
})

test('homepage exists and uses cart composable', () => {
  expect(existsSync(PAGE_PATHS.index)).toBe(true)

  const content = readFileSync(PAGE_PATHS.index, 'utf-8')
  const usesCart = CART_USAGE_PATTERNS.some(pattern => content.includes(pattern))
  expect(usesCart).toBe(true)
})

test('cart page exists and displays cart functionality', () => {
  expect(existsSync(PAGE_PATHS.cart)).toBe(true)

  const content = readFileSync(PAGE_PATHS.cart, 'utf-8')
  const usesCart = CART_USAGE_PATTERNS.some(pattern => content.includes(pattern))
  expect(usesCart).toBe(true)
  expect(content.toLowerCase().includes('cart')).toBe(true)
})

test('checkout page exists and uses cart state', () => {
  expect(existsSync(PAGE_PATHS.checkout)).toBe(true)

  const content = readFileSync(PAGE_PATHS.checkout, 'utf-8')
  const usesCart = CART_USAGE_PATTERNS.some(pattern => content.includes(pattern))
  expect(usesCart).toBe(true)

  const hasCheckoutContent = content.toLowerCase().includes('checkout') ||
                            content.toLowerCase().includes('total')
  expect(hasCheckoutContent).toBe(true)
})
