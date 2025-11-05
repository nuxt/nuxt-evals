# Nuxt Route Middleware

## What This Eval Tests

This evaluation tests the ability to create and implement route middleware in Nuxt for page-level protection and redirection. This covers Nuxt's middleware system and programmatic navigation for authentication flows.

## Why This Is Important

**Common LLM Mistakes:**
- **Wrong directory**: Placing route middleware in `server/middleware/` instead of `middleware/`
- **Incorrect function**: Using `defineEventHandler` instead of `defineNuxtRouteMiddleware`
- **Missing page meta**: Not applying middleware to pages correctly
- **Wrong navigation**: Using Vue Router instead of Nuxt's `navigateTo`

**Real-world Impact:**
Route middleware is essential for:
- Authentication and authorization
- Route protection and access control
- User role-based navigation
- Conditional redirects and guards

## How The Test Works

**Input Structure (Basic Nuxt App):**
```
app/
├── app.vue            # Root app component
└── (other standard Nuxt files)
```

**Expected Output:**
```
middleware/
└── auth.ts           # Route middleware file

app/
├── app.vue           # Root component
├── login/
│   └── page.vue      # Login page
└── dashboard/
    └── page.vue      # Protected dashboard page
```

**What Gets Tested:**
- ✅ Route middleware exists in `middleware/auth.ts`
- ✅ Uses `defineNuxtRouteMiddleware` correctly
- ✅ Redirects to `/login` when not authenticated
- ✅ Dashboard page applies the middleware
- ✅ Login page displays "Login Page"
- ✅ Application builds and redirects work correctly

## Expected Result

```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const isAuthenticated = false // Simulate auth check

  if (!isAuthenticated) {
    return navigateTo('/login')
  }
})
```

```vue
<!-- app/dashboard/page.vue -->
<template>
  <div>
    <h1>Dashboard</h1>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth'
})
</script>
```

```vue
<!-- app/login/page.vue -->
<template>
  <div>
    <h1>Login Page</h1>
  </div>
</template>
```

**Success Criteria:**
- Middleware file exists in `middleware/auth.ts`
- Uses `defineNuxtRouteMiddleware` function
- Implements authentication check (hardcoded false)
- Redirects to `/login` using `navigateTo`
- Dashboard page applies middleware via `definePageMeta`
- Login page displays "Login Page" content
- Accessing `/dashboard` redirects to `/login`

## Nuxt Best Practices Covered

- **Route middleware system**: Understanding client-side route protection
- **Page meta**: Using `definePageMeta` for middleware application
- **Programmatic navigation**: Using `navigateTo` for redirects
- **File-based routing**: Creating pages in the app directory
- **Authentication patterns**: Implementing auth guards and protected routes
