import { expect, test } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const APP_DIR = join(process.cwd(), 'app')
const PAGES_DIR = join(APP_DIR, 'pages')

const POSSIBLE_HOMEPAGE_FILES = [
  join(PAGES_DIR, 'index.vue'),
  join(APP_DIR, 'app.vue')
]

const PAGE_PATHS = {
  about: join(PAGES_DIR, 'about.vue')
}

const NAVIGATION_PATTERNS = ['NuxtLink', 'nuxt-link']

test('pages directory exists', () => {
  expect(existsSync(PAGES_DIR)).toBe(true)
})

test('homepage exists and has About navigation link', () => {
  const homepage = POSSIBLE_HOMEPAGE_FILES.find(file => existsSync(file))
  expect(homepage).toBeDefined()

  const content = readFileSync(homepage!, 'utf-8')
  // Should use NuxtLink component
  const hasNuxtLink = NAVIGATION_PATTERNS.some(pattern => content.includes(pattern))
  expect(hasNuxtLink).toBe(true)

  // Should have "About" text and link to about page
  expect(content.includes('About')).toBe(true)
  const hasAboutLink = content.includes('to="/about"') ||
                       content.includes("to='/about'") ||
                       content.includes('to="about"') ||
                       content.includes("/about")
  expect(hasAboutLink).toBe(true)
})

test('about page exists and displays About Page', () => {
  const aboutPath = join(process.cwd(), 'app', 'pages', 'about.vue')
  expect(existsSync(aboutPath)).toBe(true)

  const content = readFileSync(aboutPath, 'utf-8')
  // Should display "About Page" text
  expect(content.toLowerCase()).toMatch(/about\s*page/i)
})

test('about page has Home navigation link', () => {
  const aboutPath = join(process.cwd(), 'app', 'pages', 'about.vue')
  expect(existsSync(aboutPath)).toBe(true)

  const content = readFileSync(aboutPath, 'utf-8')
  // Should use NuxtLink component
  const hasNuxtLink = content.includes('NuxtLink') || content.includes('nuxt-link')
  expect(hasNuxtLink).toBe(true)

  // Should have "Home" text and link to home
  expect(content).toContain('Home')
  const hasHomeLink = content.includes('to="/"') || content.includes("to='/'")
  expect(hasHomeLink).toBe(true)
})
