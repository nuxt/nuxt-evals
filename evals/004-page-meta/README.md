# Nuxt Page Meta Management

This evaluation tests the implementation of page metadata using `definePageMeta` and `useHead` composables.

## Challenge

Create pages with proper meta tag management, custom layouts, and dynamic meta based on route parameters.

## Requirements

### 1. **Homepage Meta** (`/`)
- Use `definePageMeta` to set:
  - `title: 'Welcome Home'`
  - `description: 'Home page description'`

### 2. **About Page Meta** (`/about`)
- Use `definePageMeta` to set:
  - `title: 'About Us'`
  - `layout: 'special'` (assign custom layout)
- Custom layout should be visually distinct from default

### 3. **Dynamic Blog Page** (`/blog/[slug]`)
- Extract slug from route parameters
- Use `definePageMeta` with dynamic title
- Use `useHead()` for reactive meta updates
- Title should include the slug (e.g., "Blog: nuxt-is-awesome")
- Description should be dynamic based on content

### 4. **Custom Layout** (`layouts/special.vue`)
- Create a visually distinct layout for special pages
- Should include custom header, content area, and footer
- Different styling from default layout

## Expected Implementation

### Static Meta (Homepage & About)
```vue
<script setup>
definePageMeta({
  title: 'Page Title',
  description: 'Page description'
})
</script>
```

### Dynamic Meta (Blog)
```vue
<script setup>
const route = useRoute()
const slug = route.params.slug

definePageMeta({
  title: `Blog: ${slug}`
})

// Additional reactive meta
useHead({
  meta: [
    { name: 'description', content: `Blog post about ${slug}` }
  ]
})
</script>
```

## Key Nuxt Concepts Tested

- `definePageMeta()` for static page metadata
- `useHead()` for reactive meta management
- Custom layout assignment via meta
- Dynamic meta based on route parameters
- Meta inheritance and override patterns

## Expected Behavior

1. Each page should have correct `<title>` and meta tags
2. About page should use the special layout
3. Blog pages should have dynamic titles based on slug
4. Meta tags should be properly set in document head
5. Layout switching should work correctly

## Success Criteria

- ✅ Static meta tags are correctly set
- ✅ Dynamic meta updates based on route params
- ✅ Custom layout is applied to about page
- ✅ Special layout renders distinctly
- ✅ No hydration mismatches with meta
- ✅ SEO-friendly meta structure
- ✅ Tests validate meta functionality
