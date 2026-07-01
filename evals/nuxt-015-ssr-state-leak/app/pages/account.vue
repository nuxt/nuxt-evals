<script setup lang="ts">
const { profile } = useProfile()
</script>

<template>
  <div>
    <h1>Account</h1>
    <p>Name: {{ profile.name }}</p>
    <p>Email: {{ profile.email }}</p>
    <NuxtLink to="/">Back home</NuxtLink>
  </div>
</template>
