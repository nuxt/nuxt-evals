import { expect, test } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const PAGES_DIR = join(process.cwd(), 'app', 'pages')
const INDEX_PAGE = join(PAGES_DIR, 'index.vue')

test('homepage exists', () => {
  expect(existsSync(INDEX_PAGE)).toBe(true)
})

test('uses useFetch composable', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should use useFetch
  const hasUseFetch = content.includes('useFetch(')
  expect(hasUseFetch).toBe(true)
})

test('fetches from jsonplaceholder API', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should fetch from the correct URL
  const hasCorrectUrl = content.includes('jsonplaceholder.typicode.com/posts/1')
  expect(hasCorrectUrl).toBe(true)
})

test('destructures or accesses data from useFetch', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should destructure { data } or access the return value
  const destructuresData = content.includes('{ data }') ||
                          content.includes('{data}') ||
                          content.includes('const data =') ||
                          content.includes('= useFetch')
  expect(destructuresData).toBe(true)
})

test('displays title in h1 element', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')
  const contentLower = content.toLowerCase()

  // Should have h1 element
  const hasH1 = contentLower.includes('<h1')
  expect(hasH1).toBe(true)

  // Should reference title in h1
  const h1Section = content.match(/<h1[^>]*>(.*?)<\/h1>/is)
  if (h1Section) {
    const h1Content = h1Section[1]
    const hasTitle = h1Content.includes('title') || h1Content.includes('data')
    expect(hasTitle).toBe(true)
  }
})

test('displays body in paragraph element', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')
  const contentLower = content.toLowerCase()

  // Should have p element
  const hasP = contentLower.includes('<p')
  expect(hasP).toBe(true)

  // Should reference body in p
  const pSection = content.match(/<p[^>]*>(.*?)<\/p>/is)
  if (pSection) {
    const pContent = pSection[1]
    const hasBody = pContent.includes('body') || pContent.includes('data')
    expect(hasBody).toBe(true)
  }
})

test('accesses data with optional chaining or proper checks', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should use ?. or v-if to handle loading state
  const hasOptionalChaining = content.includes('?.') ||
                              content.includes('v-if') ||
                              content.includes('data &&')
  expect(hasOptionalChaining).toBe(true)
})

test('template references title field', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should access title from data
  const referencesTitle = content.includes('.title') ||
                         content.includes('["title"]') ||
                         (content.includes('{{') && content.includes('title'))
  expect(referencesTitle).toBe(true)
})

test('template references body field', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should access body from data
  const referencesBody = content.includes('.body') ||
                        content.includes('["body"]') ||
                        (content.includes('{{') && content.includes('body'))
  expect(referencesBody).toBe(true)
})