<script setup lang="ts">
useHead({
  title: 'My Website - Home',
  meta: [
    { name: 'description', content: 'Welcome to my awesome website built with Nuxt.' },
    { property: 'og:title', content: 'My Website - Home' },
    { property: 'og:description', content: 'Welcome to my awesome website built with Nuxt.' },
    { property: 'og:image', content: 'https://example.com/og-image.png' },
    { property: 'og:url', content: 'https://example.com' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'My Website - Home' },
    { name: 'twitter:description', content: 'Welcome to my awesome website built with Nuxt.' },
  ]
})
</script>

<template>
  <div>
    <h1>Welcome to My Website</h1>
    <p>This is the homepage with proper SEO meta tags.</p>
  </div>
</template>
