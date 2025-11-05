# Nuxt UI Landing Page Components

This test evaluates the ability to use Nuxt UI landing page components with proper props.

## What it tests

- Using `UPageHero` component with required props
- Using `UPageSection` component with features
- Passing props correctly (title, description, links, features)
- Defining data arrays in script setup
- Component composition patterns

## Expected behavior

The agent should create `app/pages/index.vue` with:

1. **UPageHero component** with:
   - `title` prop (string)
   - `description` prop (string)
   - `:links` prop (array binding with button configurations)

2. **UPageSection component** with:
   - `:features` prop (array with at least 3 feature objects)
   - Each feature should have name, description, and optionally icon

3. **Script setup section** defining:
   - Links array for hero buttons
   - Features array with 3+ items

## Example structure

```vue
<template>
  <UPageHero
    title="Welcome"
    description="Discover our features"
    :links="heroLinks"
  />

  <UPageSection
    title="Features"
    :features="sectionFeatures"
  />
</template>

<script setup>
const heroLinks = [
  { label: 'Get Started', to: '/start' }
]

const sectionFeatures = [
  { title: 'Fast', description: 'Lightning speed' },
  { title: 'Secure', description: 'Built with security' },
  { title: 'Scalable', description: 'Grows with you' }
]
</script>
```

## Key concepts tested

- Nuxt UI v4 landing page components
- Prop binding with `:` syntax
- Array/object props
- Script setup composition API
- Component configuration patterns
