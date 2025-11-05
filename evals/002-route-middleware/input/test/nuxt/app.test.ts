import { expect, test } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const APP_DIR = join(process.cwd(), 'app')
const MIDDLEWARE_DIR = join(APP_DIR, 'middleware')
const PAGES_DIR = join(APP_DIR, 'pages')

const MIDDLEWARE_PATHS = {
  auth: join(MIDDLEWARE_DIR, 'auth.ts')
}

const PAGE_PATHS = {
  login: join(PAGES_DIR, 'login.vue'),
  dashboard: join(PAGES_DIR, 'dashboard.vue')
}

const MIDDLEWARE_PATTERNS = ['defineNuxtRouteMiddleware', 'navigateTo']
const MIDDLEWARE_USAGE_PATTERNS = [
  'middleware:',
  "middleware: 'auth'",
  'middleware: ["auth"]',
  'definePageMeta'
]

test('middleware directory exists', () => {
  expect(existsSync(MIDDLEWARE_DIR)).toBe(true)
})

test('auth middleware exists and implements authentication logic', () => {
  expect(existsSync(MIDDLEWARE_PATHS.auth)).toBe(true)

  const content = readFileSync(MIDDLEWARE_PATHS.auth, 'utf-8')
  // Should use Nuxt middleware patterns
  const hasMiddlewareStructure = MIDDLEWARE_PATTERNS.some(pattern => content.includes(pattern))
  expect(hasMiddlewareStructure).toBe(true)

  // Should redirect to login
  expect(content.toLowerCase().includes('login')).toBe(true)
})

test('auth middleware uses navigateTo for redirection', () => {
  expect(existsSync(MIDDLEWARE_PATHS.auth)).toBe(true)

  const content = readFileSync(MIDDLEWARE_PATHS.auth, 'utf-8')
  // Should use navigateTo for redirect
  expect(content.includes('navigateTo')).toBe(true)

  // Should redirect specifically to /login
  const hasLoginRedirect = content.includes("navigateTo('/login')") ||
                           content.includes('navigateTo("/login")')
  expect(hasLoginRedirect).toBe(true)
})

test('auth middleware has hardcoded false authentication check', () => {
  expect(existsSync(MIDDLEWARE_PATHS.auth)).toBe(true)

  const content = readFileSync(MIDDLEWARE_PATHS.auth, 'utf-8')
  // Should have hardcoded false value for authentication
  const hasFalseAuth = content.includes('false') &&
                       (content.includes('isAuthenticated') ||
                        content.includes('authenticated') ||
                        content.includes('const '))
  expect(hasFalseAuth).toBe(true)
})

test('login page exists and displays login content', () => {
  expect(existsSync(PAGE_PATHS.login)).toBe(true)

  const content = readFileSync(PAGE_PATHS.login, 'utf-8')
  const contentLower = content.toLowerCase()
  expect(contentLower.includes('login') && contentLower.includes('page')).toBe(true)
})

test('dashboard page exists and displays dashboard content', () => {
  expect(existsSync(PAGE_PATHS.dashboard)).toBe(true)

  const content = readFileSync(PAGE_PATHS.dashboard, 'utf-8')
  expect(content.toLowerCase().includes('dashboard')).toBe(true)
})

test('dashboard page applies auth middleware', () => {
  expect(existsSync(PAGE_PATHS.dashboard)).toBe(true)

  const content = readFileSync(PAGE_PATHS.dashboard, 'utf-8')
  // Should apply auth middleware using various valid patterns
  const hasMiddleware = MIDDLEWARE_USAGE_PATTERNS.some(pattern => content.includes(pattern)) &&
                       content.includes('auth')
  expect(hasMiddleware).toBe(true)
})