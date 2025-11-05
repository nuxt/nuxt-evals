import { expect, test } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const API_DIR = join(process.cwd(), 'server', 'api')
const APP_DIR = join(process.cwd(), 'app')

const POSSIBLE_API_FILES = [
  join(API_DIR, 'hello.ts'),
  join(API_DIR, 'hello.get.ts'),
  join(API_DIR, 'index.ts'),
  join(API_DIR, 'index.get.ts')
]

const POSSIBLE_HOMEPAGE_FILES = [
  join(APP_DIR, 'pages', 'index.vue'),
  join(APP_DIR, 'app.vue')
]

const DATA_FETCHING_PATTERNS = ['useFetch', 'useAsyncData', '$fetch', 'await $fetch']

test('API route directory exists', () => {
  expect(existsSync(API_DIR)).toBe(true)
})

test('API route file exists and returns Hello world', () => {
  const apiFile = POSSIBLE_API_FILES.find(file => existsSync(file))
  expect(apiFile).toBeDefined()

  const content = readFileSync(apiFile!, 'utf-8')
  // Should use Nuxt API structure
  const hasApiStructure = content.includes('export default') ||
                          content.includes('defineEventHandler') ||
                          content.includes('eventHandler')
  expect(hasApiStructure).toBe(true)

  // Should return "Hello world"
  const contentLower = content.toLowerCase()
  expect(contentLower.includes('hello') && contentLower.includes('world')).toBe(true)
})

test('app.vue file exists', () => {
  expect(existsSync(join(APP_DIR, 'app.vue'))).toBe(true)
})

test('homepage exists and uses data fetching', () => {
  const homepage = POSSIBLE_HOMEPAGE_FILES.find(file => existsSync(file))
  expect(homepage).toBeDefined()

  const content = readFileSync(homepage!, 'utf-8')
  const usesDataFetching = DATA_FETCHING_PATTERNS.some(pattern => content.includes(pattern))
  expect(usesDataFetching).toBe(true)
})

test('homepage template uses Vue interpolation to display data', () => {
  const homepage = POSSIBLE_HOMEPAGE_FILES.find(file => existsSync(file))
  expect(homepage).toBeDefined()

  const content = readFileSync(homepage!, 'utf-8')
  // Should have Vue template interpolation for displaying data
  const hasInterpolation = content.includes('{{') && content.includes('}}')
  expect(hasInterpolation).toBe(true)
})
