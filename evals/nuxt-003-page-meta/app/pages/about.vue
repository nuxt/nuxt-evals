<script setup>
// The AI should add definePageMeta here with:
// title: 'About Us'
// layout: 'special'
</script>

<template>
  <div>
    <h1>About Us</h1>
    <p>This page should use the 'special' layout and have custom meta tags.</p>
    <p>The AI should implement definePageMeta to assign a custom layout.</p>

    <nav>
      <NuxtLink to="/">Back Home</NuxtLink>
    </nav>
  </div>
</template>

<style scoped>
nav a {
  color: #007bff;
  text-decoration: none;
}

nav a:hover {
  text-decoration: underline;
}
</style>
