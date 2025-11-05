# Nuxt useFetch Data Fetching

This test evaluates the ability to fetch data from an external API using Nuxt's useFetch composable.

## What it tests

- Using `useFetch()` composable (not fetch/axios/$fetch)
- Fetching from external API
- Accessing reactive data with `.value`
- Displaying fetched data in template
- No useEffect/onMounted for data fetching
- SSR-compatible data fetching patterns

## Expected behavior

The agent should create `app/pages/index.vue` that:

1. **Uses useFetch composable** to fetch from the API
2. **Destructures { data }** or accesses the return value
3. **Accesses data.value** in template (or via computed/direct)
4. **Displays title** in an h1 element
5. **Displays body** in a paragraph element
6. **No manual fetching** - No fetch(), axios, or useEffect patterns

## Example structure

```vue
<script setup>
const { data } = await useFetch('https://jsonplaceholder.typicode.com/posts/1')
</script>

<template>
  <div>
    <h1>{{ data?.title }}</h1>
    <p>{{ data?.body }}</p>
  </div>
</template>
```

Or without await:

```vue
<script setup>
const { data } = useFetch('https://jsonplaceholder.typicode.com/posts/1')
</script>

<template>
  <div>
    <h1>{{ data?.title }}</h1>
    <p>{{ data?.body }}</p>
  </div>
</template>
```

## Key concepts tested

- Nuxt useFetch composable
- SSR data fetching
- Reactive data access
- Template interpolation
- No manual lifecycle hooks for data fetching
