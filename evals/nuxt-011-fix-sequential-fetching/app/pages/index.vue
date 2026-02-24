<script setup lang="ts">
const { data: user } = await useFetch('https://jsonplaceholder.typicode.com/users/1')
const { data: posts } = await useFetch('https://jsonplaceholder.typicode.com/users/1/posts')
</script>

<template>
  <div>
    <h1>Dashboard</h1>

    <section>
      <h2>Profile</h2>
      <p>{{ user?.name }}</p>
      <p>{{ user?.email }}</p>
    </section>

    <section>
      <h2>Posts</h2>
      <ul>
        <li v-for="post in posts" :key="post.id">
          {{ post.title }}
        </li>
      </ul>
    </section>
  </div>
</template>
