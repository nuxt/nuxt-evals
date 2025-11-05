# Nuxt Routing with NuxtLink

## What This Eval Tests

This evaluation tests the ability to implement client-side navigation in Nuxt using the `NuxtLink` component. This covers fundamental Nuxt routing concepts and proper declarative navigation patterns.

## Why This Is Important

**Common LLM Mistakes:**
- **Wrong navigation method**: Using regular `<a>` tags instead of `NuxtLink`
- **Missing page creation**: Not creating the target page to navigate to
- **Incorrect component usage**: Wrong props or syntax for NuxtLink
- **Import confusion**: Trying to import `NuxtLink` when it's auto-imported

**Real-world Impact:**
Declarative navigation with NuxtLink is the standard way to handle routing in Nuxt applications. It provides automatic prefetching, client-side navigation, and better performance compared to traditional links.

## How The Test Works

**Input Structure (Basic Nuxt App):**
```
app/
├── app.vue            # Root app component (minimal)
└── (other standard Nuxt files)
```

**Expected Output:**
```
app/
├── app.vue           # Updated with navigation button
└── about/
    └── page.vue      # About page with "About Page" content
```

**What Gets Tested:**
- ✅ Homepage contains link with text "About"
- ✅ Link uses NuxtLink component for navigation
- ✅ About page exists and displays "About Page"
- ✅ About page has "Home" link back to homepage
- ✅ Application builds and navigation works correctly

## Expected Result

```vue
<!-- app.vue -->
<template>
  <div>
    <h1>Welcome to Nuxt</h1>
    <nav>
      <NuxtLink to="/about">About</NuxtLink>
    </nav>
    <NuxtPage />
  </div>
</template>
```

```vue
<!-- app/about/page.vue -->
<template>
  <div>
    <h1>About Page</h1>
    <nav>
      <NuxtLink to="/">Home</NuxtLink>
    </nav>
  </div>
</template>
```

**Success Criteria:**
- Homepage has NuxtLink with text "About" linking to `/about`
- About page displays "About Page" content
- About page has NuxtLink with text "Home" linking to `/`
- Uses NuxtLink component (auto-imported)
- Application builds without errors

## Nuxt Best Practices Covered

- **Declarative navigation**: Using NuxtLink for standard navigation
- **Auto-imported components**: Using NuxtLink without manual imports
- **File-based routing**: Creating pages in the `app/` directory
- **Client-side navigation**: Proper SPA-style routing with prefetching
