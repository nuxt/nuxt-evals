import { expect, test } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const PAGES_DIR = join(process.cwd(), 'app', 'pages')
const INDEX_PAGE = join(PAGES_DIR, 'index.vue')

test('homepage exists', () => {
  expect(existsSync(INDEX_PAGE)).toBe(true)
})

test('imports zod', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should import zod
  const hasZodImport = content.includes('from \'zod\'') ||
                       content.includes('from "zod"') ||
                       content.includes('import * as z from')
  expect(hasZodImport).toBe(true)
})

test('defines zod schema', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should define schema using z.object
  const hasSchema = content.includes('z.object') &&
                    (content.includes('const schema') || content.includes('schema ='))
  expect(hasSchema).toBe(true)
})

test('schema has email validation', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should have email field with validation
  const hasEmailValidation = content.includes('email') &&
                             (content.includes('.email(') || content.includes('z.string().email'))
  expect(hasEmailValidation).toBe(true)
})

test('schema has password with min length', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should have password field with min validation
  const hasPasswordMin = content.includes('password') &&
                         content.includes('.min(')
  expect(hasPasswordMin).toBe(true)
})

test('uses reactive state', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should use reactive() for state
  const hasReactive = content.includes('reactive(') || content.includes('reactive<')
  expect(hasReactive).toBe(true)
})

test('uses UForm component', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should use UForm
  const hasUForm = content.includes('UForm') || content.includes('u-form')
  expect(hasUForm).toBe(true)
})

test('UForm has schema prop', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should bind schema prop
  const hasSchemaBinding = content.includes(':schema') &&
                          (content.includes('UForm') || content.includes('u-form'))
  expect(hasSchemaBinding).toBe(true)
})

test('UForm has state prop', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should bind state prop
  const hasStateBinding = content.includes(':state') &&
                         (content.includes('UForm') || content.includes('u-form'))
  expect(hasStateBinding).toBe(true)
})

test('UForm has submit handler', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should have @submit handler
  const hasSubmitHandler = content.includes('@submit') &&
                          (content.includes('UForm') || content.includes('u-form'))
  expect(hasSubmitHandler).toBe(true)
})

test('uses UFormField components', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should use UFormField
  const hasUFormField = content.includes('UFormField') || content.includes('u-form-field')
  expect(hasUFormField).toBe(true)
})

test('has email UFormField', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should have UFormField with name="email"
  const hasEmailField = (content.includes('UFormField') || content.includes('u-form-field')) &&
                        content.includes('name="email"')
  expect(hasEmailField).toBe(true)
})

test('has password UFormField', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should have UFormField with name="password"
  const hasPasswordField = (content.includes('UFormField') || content.includes('u-form-field')) &&
                           content.includes('name="password"')
  expect(hasPasswordField).toBe(true)
})

test('uses UInput components', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should use UInput
  const hasUInput = content.includes('UInput') || content.includes('u-input')
  expect(hasUInput).toBe(true)
})

test('UInput has v-model binding', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should have v-model on UInput
  const hasVModel = (content.includes('UInput') || content.includes('u-input')) &&
                    content.includes('v-model')
  expect(hasVModel).toBe(true)
})

test('password input has type="password"', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should have type="password" on password input
  const hasPasswordType = content.includes('type="password"')
  expect(hasPasswordType).toBe(true)
})

test('uses UButton for submit', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should use UButton
  const hasUButton = content.includes('UButton') || content.includes('u-button')
  expect(hasUButton).toBe(true)

  // Should have type="submit"
  const hasSubmitType = content.includes('type="submit"')
  expect(hasSubmitType).toBe(true)
})

test('uses useToast composable', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should use useToast
  const hasUseToast = content.includes('useToast()')
  expect(hasUseToast).toBe(true)
})

test('calls toast.add in submit handler', () => {
  const content = readFileSync(INDEX_PAGE, 'utf-8')

  // Should call toast.add
  const hasToastAdd = content.includes('toast.add(')
  expect(hasToastAdd).toBe(true)
})