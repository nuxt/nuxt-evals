<script setup lang="ts">
const appConfig = useAppConfig()
</script>

<template>
  <header>
    <h1>{{ appConfig.title }}</h1>
    <nav>
      <NuxtLink to="/">Home</NuxtLink>
      <NuxtLink to="/about">About</NuxtLink>
    </nav>
  </header>
</template>
