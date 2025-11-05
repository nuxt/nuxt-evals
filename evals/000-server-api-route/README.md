# Nuxt API Route and Data Fetching

## What This Eval Tests

This evaluation tests the ability to create API routes in Nuxt and implement proper data fetching patterns between the server and client. This covers fundamental Nuxt concepts including file-based API routing, server-side functionality, and composable usage for data fetching.

## Why This Is Important

**Common LLM Mistakes:**
- **Wrong API directory**: Creating API routes in incorrect locations (not in `server/api/`)
- **Improper data fetching**: Using client-side fetch instead of Nuxt's optimized composables
- **Hydration mismatches**: Causing SSR/client-side rendering inconsistencies
- **Incorrect file naming**: Not following Nuxt's file-based routing conventions

**Real-world Impact:**
API routes and data fetching are core to most web applications. Understanding how Nuxt's server engine works, along with its optimized data fetching patterns using `useFetch`, `useAsyncData`, and other composables, is essential for building performant full-stack applications.

## How The Test Works

**Input Structure (Basic Nuxt App):**
```
app/
├── app.vue            # Root app component (minimal)
└── (other standard Nuxt files)
```

**Expected Output:**
```
server/
└── api/
    └── hello.ts       # API route handler

app/
├── app.vue           # Updated to fetch and display API data
└── (other files)
```

**What Gets Tested:**
- ✅ API route exists in correct `server/api/` directory
- ✅ API route returns proper JSON response `{ hello: 'world' }`
- ✅ Frontend fetches data using Nuxt composables (`useFetch` or `useAsyncData`)
- ✅ Data is displayed properly on the homepage
- ✅ Application builds and runs successfully

## Expected Result

```typescript
// server/api/hello.ts
export default defineEventHandler(async (event) => {
  return {
    hello: 'world'
  }
})

// OR with more explicit typing:
export default defineEventHandler(async (event): Promise<{ hello: string }> => {
  return {
    hello: 'world'
  }
})
```

```vue
<!-- app.vue -->
<template>
  <div>
    <h1>Welcome to Nuxt</h1>
    <div v-if="pending">Loading...</div>
    <div v-else-if="error">Error: {{ error }}</div>
    <div v-else>
      <p>Message from API: {{ data?.hello }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Option 1: Using useFetch (recommended for reactive data)
const { data, pending, error } = await useFetch('/api/hello')

// Option 2: Using useAsyncData (for more control over data fetching)
// const { data, pending, error } = await useAsyncData('hello', () => $fetch('/api/hello'))
</script>
```

**Success Criteria:**
- API route is created in the correct `server/api/` directory
- API route returns the expected JSON structure
- Frontend properly fetches data using Nuxt composables
- Data is displayed in a user-friendly way
- Application handles loading and error states appropriately
- Application builds without errors

## Nuxt Best Practices Covered

- **File-based API routing**: Understanding Nuxt's automatic API route creation
- **Server-side functionality**: Using `defineEventHandler` for API endpoints
- **Data fetching composables**: Leveraging `useFetch` and `useAsyncData` for reactive data fetching
- **Error handling**: Implementing proper loading and error states
- **SSR compatibility**: Ensuring data fetching works with server-side rendering
