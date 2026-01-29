<script setup>
// The AI should implement:
// 1. Get the slug from route params
// 2. Use definePageMeta with dynamic title based on slug
// 3. Use useHead() for reactive meta updates

const route = useRoute()
// The AI should use this slug to create dynamic meta
const slug = route.params.slug
</script>

<template>
  <div>
    <h1>Blog Post: {{ slug }}</h1>
    <p>This is a dynamic blog page. The AI should implement:</p>
    <ul>
      <li>Dynamic page title based on slug parameter</li>
      <li>Dynamic description</li>
      <li>Use useHead() for reactive meta updates</li>
    </ul>

    <p>Current slug: <code>{{ slug }}</code></p>

    <nav>
      <NuxtLink to="/">Back Home</NuxtLink>
    </nav>
  </div>
</template>

<style scoped>
code {
  background: #f4f4f4;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
}

nav a {
  color: #007bff;
  text-decoration: none;
}

nav a:hover {
  text-decoration: underline;
}
</style>
