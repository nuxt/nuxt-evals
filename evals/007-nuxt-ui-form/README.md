# Nuxt UI Form with Zod Validation

This test evaluates the ability to create forms using Nuxt UI components with Zod validation.

## What it tests

- Using `UForm` component with schema validation
- Using `UFormField` for form fields
- Using `UInput` for text inputs
- Zod schema validation
- Reactive state with `reactive()`
- Form submission handling
- Toast notifications with `useToast()`
- Type safety with TypeScript

## Expected behavior

The agent should create `app/pages/index.vue` with:

1. **Zod schema** defining:
   - Email field with email validation
   - Password field with min 8 characters

2. **UForm component** with:
   - `:schema` prop bound to zod schema
   - `:state` prop bound to reactive state
   - `@submit` handler

3. **Form fields**:
   - UFormField for email with UInput
   - UFormField for password with UInput type="password"
   - UButton type="submit"

4. **Form handling**:
   - `reactive()` state for form data
   - `useToast()` for success feedback
   - Type safety with `z.output<typeof schema>`

## Example structure

```vue
<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Must be at least 8 characters')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  email: undefined,
  password: undefined
})

const toast = useToast()

async function onSubmit(event: FormSubmitEvent<Schema>) {
  toast.add({ title: 'Success', color: 'success' })
}
</script>

<template>
  <UForm :schema="schema" :state="state" @submit="onSubmit">
    <UFormField label="Email" name="email">
      <UInput v-model="state.email" />
    </UFormField>

    <UFormField label="Password" name="password">
      <UInput v-model="state.password" type="password" />
    </UFormField>

    <UButton type="submit">Submit</UButton>
  </UForm>
</template>
```

## Key concepts tested

- Nuxt UI form components
- Zod validation integration
- Reactive state management
- Form submission patterns
- Toast notifications
- TypeScript type safety
