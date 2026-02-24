<script setup lang="ts">
const { data: posts, status } = await useFetch('/api/posts')
</script>

<template>
  <div>
    <h1>Blog Posts</h1>
    <p v-if="status === 'pending'">Loading posts...</p>
    <ul v-else>
      <li v-for="post in posts" :key="post.id">
        {{ post.title }}
      </li>
    </ul>
  </div>
</template>
