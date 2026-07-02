<script setup lang="ts">
interface User { name: string }

const { data: user } = await useFetch<User>('/api/user', { dedupe: true })

// Show a fallback until the user has loaded.
const label = computed(() => (user.value === null ? 'Loading…' : user.value.name))
</script>

<template>
  <div>
    <h1>{{ label }}</h1>
  </div>
</template>
