# Nuxt Error Handling

This test evaluates the ability to handle errors in Nuxt using error pages and error boundaries.

## What it tests

- Creating custom `error.vue` page
- Using `useError()` composable
- Using `clearError()` to dismiss errors
- Using `<NuxtErrorBoundary>` component
- Using `createError()` to throw errors
- Error handling patterns in components

## Expected behavior

The agent should create:

1. **error.vue** in app root with:
   - `useError()` to access error details
   - Display error message or statusCode
   - Button that calls `clearError()` to dismiss

2. **A page using NuxtErrorBoundary** with:
   - `<NuxtErrorBoundary>` component
   - Default slot with trigger button
   - `#error` slot to display error
   - Uses `createError()` or throws error
   - Option to clear error locally

## Example structure

```vue
<!-- app/error.vue -->
<script setup>
const error = useError()

const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <div>
    <h1>{{ error.statusCode }}</h1>
    <p>{{ error.message }}</p>
    <button @click="handleError">Clear</button>
  </div>
</template>
```

```vue
<!-- app/pages/index.vue -->
<template>
  <NuxtErrorBoundary>
    <button @click="throwError">Trigger Error</button>

    <template #error="{ error }">
      <p>{{ error.message }}</p>
      <button @click="error = null">Clear</button>
    </template>
  </NuxtErrorBoundary>
</template>

<script setup>
const throwError = () => {
  throw createError({
    message: 'Something went wrong',
    statusCode: 500
  })
}
</script>
```

## Key concepts tested

- Global error page (error.vue)
- Local error boundaries (NuxtErrorBoundary)
- Error utilities (useError, createError, clearError)
- Error handling patterns
- Error recovery UI
