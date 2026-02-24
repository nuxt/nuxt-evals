<script setup lang="ts">
const data = ref<{ message: string } | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const result = await $fetch('/api/greeting')
    data.value = result
  } catch (e) {
    error.value = 'Failed to fetch greeting'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <h1>Welcome</h1>
    <p v-if="loading">Loading...</p>
    <p v-else-if="error">{{ error }}</p>
    <p v-else>{{ data?.message }}</p>
  </div>
</template>
