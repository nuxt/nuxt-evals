<script setup>
// The AI should add definePageMeta here with:
// title: 'Welcome Home'
// description: 'Home page description'
</script>

<template>
  <div>
    <h1>Welcome Home</h1>
    <p>This is the homepage. The AI should implement definePageMeta to set the page title and description.</p>

    <nav>
      <ul>
        <li><NuxtLink to="/about">About Us</NuxtLink></li>
        <li><NuxtLink to="/blog/nuxt-is-awesome">Blog Post</NuxtLink></li>
      </ul>
    </nav>
  </div>
</template>

<style scoped>
nav ul {
  list-style: none;
  padding: 0;
}

nav li {
  margin: 0.5rem 0;
}

nav a {
  color: #007bff;
  text-decoration: none;
}

nav a:hover {
  text-decoration: underline;
}
</style>
