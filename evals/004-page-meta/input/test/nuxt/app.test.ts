import { expect, test } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const APP_DIR = join(process.cwd(), 'app')
const PAGES_DIR = join(APP_DIR, 'pages')
const LAYOUTS_DIR = join(APP_DIR, 'layouts')
const BLOG_DIR = join(PAGES_DIR, 'blog')

const PAGE_PATHS = {
  index: join(PAGES_DIR, 'index.vue'),
  about: join(PAGES_DIR, 'about.vue'),
  blogSlug: join(BLOG_DIR, '[slug].vue')
}

const LAYOUT_PATHS = {
  special: join(LAYOUTS_DIR, 'special.vue')
}

const META_PATTERNS = ['definePageMeta', 'useHead']
const ROUTE_PATTERNS = ['useRoute', 'route.params', 'params.slug']

test('pages directory exists', () => {
  expect(existsSync(PAGES_DIR)).toBe(true)
})

test('layouts directory exists', () => {
  expect(existsSync(LAYOUTS_DIR)).toBe(true)
})

test('special layout exists', () => {
  expect(existsSync(LAYOUT_PATHS.special)).toBe(true)
})

test('special layout has template and slot', () => {
  expect(existsSync(LAYOUT_PATHS.special)).toBe(true)

  const content = readFileSync(LAYOUT_PATHS.special, 'utf-8')
  const hasTemplate = content.includes('<template>') && content.includes('</template>')
  const hasSlot = content.includes('<slot') && content.includes('>')
  expect(hasTemplate).toBe(true)
  expect(hasSlot).toBe(true)
})

test('homepage exists with meta config and Welcome Home title', () => {
  expect(existsSync(PAGE_PATHS.index)).toBe(true)

  const content = readFileSync(PAGE_PATHS.index, 'utf-8')
  // Should use meta configuration
  const hasMetaConfig = META_PATTERNS.some(pattern => content.includes(pattern))
  expect(hasMetaConfig).toBe(true)

  // Should have Welcome Home title
  const hasWelcomeTitle = content.includes('Welcome Home') ||
                          (content.includes('Welcome') && content.includes('Home'))
  expect(hasWelcomeTitle).toBe(true)
})

test('about page exists with meta config and special layout', () => {
  expect(existsSync(PAGE_PATHS.about)).toBe(true)

  const content = readFileSync(PAGE_PATHS.about, 'utf-8')
  // Should use meta configuration
  const hasMetaConfig = META_PATTERNS.some(pattern => content.includes(pattern))
  expect(hasMetaConfig).toBe(true)

  // Should have About Us title and special layout
  expect(content.includes('About Us')).toBe(true)
  expect(content.includes('special')).toBe(true)
})

test('blog dynamic page exists with route handling', () => {
  expect(existsSync(PAGE_PATHS.blogSlug)).toBe(true)

  const content = readFileSync(PAGE_PATHS.blogSlug, 'utf-8')
  // Should use route params
  const usesRoute = ROUTE_PATTERNS.some(pattern => content.includes(pattern))
  expect(usesRoute).toBe(true)

  // Should have meta configuration
  const hasMetaConfig = META_PATTERNS.some(pattern => content.includes(pattern))
  expect(hasMetaConfig).toBe(true)
})

test('all pages use proper meta', () => {
  const allPages = [PAGE_PATHS.index, PAGE_PATHS.about]

  allPages.forEach(pagePath => {
    if (existsSync(pagePath)) {
      const content = readFileSync(pagePath, 'utf-8')

      // Should use meta configuration
      const hasMetaConfig = META_PATTERNS.some(pattern => content.includes(pattern))
      expect(hasMetaConfig).toBe(true)
    }
  })
})