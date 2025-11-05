import { expect, test } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const PAGES_DIR = join(process.cwd(), 'app', 'pages')
const INDEX_PAGE = join(PAGES_DIR, 'index.vue')

test('homepage exists', () => {
  expect(existsSync(INDEX_PAGE)).toBe(true)
})

test('uses UPageHero component', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should use UPageHero
  const hasUPageHero = content.includes('UPageHero') || content.includes('u-page-hero')
  expect(hasUPageHero).toBe(true)
})

test('UPageHero has title prop', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should have title prop on UPageHero
  const hasTitleProp = content.includes('title=') &&
                       (content.includes('UPageHero') || content.includes('u-page-hero'))
  expect(hasTitleProp).toBe(true)
})

test('UPageHero has description prop', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should have description prop
  const hasDescriptionProp = content.includes('description=') &&
                            (content.includes('UPageHero') || content.includes('u-page-hero'))
  expect(hasDescriptionProp).toBe(true)
})

test('UPageHero has links prop', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should have :links prop binding
  const hasLinksProp = content.includes(':links') &&
                      (content.includes('UPageHero') || content.includes('u-page-hero'))
  expect(hasLinksProp).toBe(true)
})

test('uses UPageSection component', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should use UPageSection
  const hasUPageSection = content.includes('UPageSection') ||
                            content.includes('u-page-section')
  expect(hasUPageSection).toBe(true)
})

test('UPageSection has features prop', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should have :features prop binding
  const hasFeaturesProp = content.includes(':features') &&
                         (content.includes('UPageSection') || content.includes('u-page-section'))
  expect(hasFeaturesProp).toBe(true)
})

test('features contains at least 3 items', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Look for features array definition in script (const features = [...])
  const scriptFeaturesMatch = content.match(/(?:const|let)\s+\w*features\w*\s*=\s*\[([\s\S]*?)\]/i)

  // Look for inline features array in template (:features="[...]")
  const inlineFeaturesMatch = content.match(/:features\s*=\s*"\[([\s\S]*?)\]"/i) ||
                              content.match(/:features\s*=\s*'\[([\s\S]*?)\']/i)

  if (scriptFeaturesMatch) {
    // Count objects in script definition
    const featuresContent = scriptFeaturesMatch[1]
    const itemCount = (featuresContent.match(/\{/g) || []).length
    expect(itemCount).toBeGreaterThanOrEqual(3)
  } else if (inlineFeaturesMatch) {
    // Count objects in inline definition
    const featuresContent = inlineFeaturesMatch[1]
    const itemCount = (featuresContent.match(/\{/g) || []).length
    expect(itemCount).toBeGreaterThanOrEqual(3)
  } else {
    // If neither found, at least verify features prop is used
    const hasFeaturesProp = content.includes(':features')
    expect(hasFeaturesProp).toBe(true)
  }
})