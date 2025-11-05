import { expect, test } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const APP_DIR = join(process.cwd(), 'app')
const ERROR_PAGE = join(APP_DIR, 'error.vue')
const PAGES_DIR = join(APP_DIR, 'pages')
const INDEX_PAGE = join(PAGES_DIR, 'index.vue')

test('error.vue exists in app directory', () => {
  expect(existsSync(ERROR_PAGE)).toBe(true)
})

test('error.vue uses useError composable', () => {
  const content = readFileSync(ERROR_PAGE, 'utf-8')

  // Should use useError()
  const hasUseError = content.includes('useError()')
  expect(hasUseError).toBe(true)
})

test('error.vue displays error information', () => {
  const content = readFileSync(ERROR_PAGE, 'utf-8')

  // Should reference error object (error.message, error.statusCode, etc.)
  const displaysError = content.includes('error.') ||
                        content.includes('error?.') ||
                        content.includes('error?.')
  expect(displaysError).toBe(true)
})

test('error.vue has clear error functionality', () => {
  const content = readFileSync(ERROR_PAGE, 'utf-8')

  // Should use clearError
  const hasClearError = content.includes('clearError(')
  expect(hasClearError).toBe(true)
})

test('error.vue has button or link to clear', () => {
  const content = readFileSync(ERROR_PAGE, 'utf-8')
  const contentLower = content.toLowerCase()

  // Should have clickable element
  const hasClickable = contentLower.includes('<button') ||
                       contentLower.includes('<nuxtlink') ||
                       contentLower.includes('@click')
  expect(hasClickable).toBe(true)
})

test('homepage exists', () => {
  expect(existsSync(INDEX_PAGE)).toBe(true)
})

test('uses NuxtErrorBoundary component', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should use NuxtErrorBoundary
  const hasErrorBoundary = content.includes('NuxtErrorBoundary') ||
                          content.includes('nuxt-error-boundary')
  expect(hasErrorBoundary).toBe(true)
})

test('NuxtErrorBoundary has error slot', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should have #error slot
  const hasErrorSlot = content.includes('#error') &&
                      (content.includes('NuxtErrorBoundary') || content.includes('nuxt-error-boundary'))
  expect(hasErrorSlot).toBe(true)
})

test('error slot receives error prop', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should destructure or access error in slot
  const hasErrorProp = (content.includes('#error="{ error }') ||
                       content.includes('#error="{ error,') ||
                       content.includes('#error="error"')) &&
                       (content.includes('NuxtErrorBoundary') || content.includes('nuxt-error-boundary'))
  expect(hasErrorProp).toBe(true)
})

test('displays error message in error slot', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should display error details in error slot
  const displaysErrorInSlot = content.includes('error.message') ||
                              content.includes('error?.message') ||
                              content.includes('{{ error }}')
  expect(displaysErrorInSlot).toBe(true)
})

test('has button to trigger error', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')
  const contentLower = content.toLowerCase()

  // Should have button that triggers error
  const hasErrorButton = contentLower.includes('<button') && contentLower.includes('@click')
  expect(hasErrorButton).toBe(true)
})

test('uses createError to throw error', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should use createError or throw error
  const hasCreateError = content.includes('createError(') ||
                         content.includes('throw createError') ||
                         content.includes('throw new Error')
  expect(hasCreateError).toBe(true)
})

test('has way to clear error locally', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should have way to clear error (error = null or button in error slot)
  const canClearError = (content.includes('error = null') ||
                        content.includes('error.value = null')) &&
                        content.includes('#error')
  expect(canClearError).toBe(true)
})