import { expect, test } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const APP_DIR = join(process.cwd(), 'app')
const NUXT_CONFIG_PATH = join(process.cwd(), 'nuxt.config.ts')
const PACKAGE_JSON_PATH = join(process.cwd(), 'package.json')
const APP_VUE_PATH = join(APP_DIR, 'app.vue')

const POSSIBLE_CSS_PATHS = [
  join(APP_DIR, 'assets', 'css', 'main.css'),
  join(APP_DIR, 'assets', 'main.css'),
  join(APP_DIR, 'assets', 'styles', 'main.css'),
  join(APP_DIR, 'assets', 'global.css'),
  join(APP_DIR, 'assets', 'css', 'global.css')
]

test('package.json includes @nuxt/ui dependency', () => {
  expect(existsSync(PACKAGE_JSON_PATH)).toBe(true)

  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'))
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  }

  expect(allDeps['@nuxt/ui']).toBeDefined()
})

test('CSS file exists with Tailwind CSS and Nuxt UI imports', () => {
  const cssFile = POSSIBLE_CSS_PATHS.find(path => existsSync(path))
  expect(cssFile).toBeDefined()

  const content = readFileSync(cssFile!, 'utf-8')

  // Should import Tailwind CSS
  const hasTailwindImport = content.includes('@import "tailwindcss"') ||
                           content.includes("@import 'tailwindcss'")
  expect(hasTailwindImport).toBe(true)

  // Should import Nuxt UI
  const hasNuxtUIImport = content.includes('@import "@nuxt/ui"') ||
                         content.includes("@import '@nuxt/ui'")
  expect(hasNuxtUIImport).toBe(true)
})

test('nuxt.config.ts includes @nuxt/ui module', () => {
  expect(existsSync(NUXT_CONFIG_PATH)).toBe(true)

  const content = readFileSync(NUXT_CONFIG_PATH, 'utf-8')

  // Should have modules array
  expect(content.includes('modules')).toBe(true)

  // Should include @nuxt/ui module
  const hasNuxtUIModule = content.includes("'@nuxt/ui'") ||
                         content.includes('"@nuxt/ui"')
  expect(hasNuxtUIModule).toBe(true)
})

test('nuxt.config.ts imports the CSS file', () => {
  expect(existsSync(NUXT_CONFIG_PATH)).toBe(true)

  const content = readFileSync(NUXT_CONFIG_PATH, 'utf-8')

  // Should have css array
  expect(content.includes('css')).toBe(true)

  // Should import a CSS file (various possible paths)
  const hasCSSImport = content.includes('main.css') ||
                      content.includes('global.css') ||
                      (content.includes('css:') && content.includes('.css'))
  expect(hasCSSImport).toBe(true)
})

test('app.vue wraps content with UApp component', () => {
  expect(existsSync(APP_VUE_PATH)).toBe(true)

  const content = readFileSync(APP_VUE_PATH, 'utf-8')

  // Should have UApp component
  const hasUApp = content.includes('<UApp') || content.includes('<u-app')
  expect(hasUApp).toBe(true)

  // Should close UApp component
  const closesUApp = content.includes('</UApp>') || content.includes('</u-app>')
  expect(closesUApp).toBe(true)
})
