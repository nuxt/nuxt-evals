<script setup lang="ts">
interface User {
  id: number
  name: string
  email: string
  role: string
}

const userId = ref(1)
const user = ref<User | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

async function fetchUser() {
  loading.value = true
  error.value = null
  try {
    user.value = await $fetch(`/api/users/${userId.value}`)
  } catch (e: any) {
    error.value = e.data?.message || 'Failed to load user'
  } finally {
    loading.value = false
  }
}

watch(userId, () => {
  fetchUser()
})

onMounted(() => {
  fetchUser()
})
</script>

<template>
  <div>
    <h1>User Lookup</h1>

    <div>
      <label for="userId">User ID:</label>
      <input id="userId" v-model.number="userId" type="number" min="1" max="5" />
    </div>

    <div v-if="loading">Loading...</div>
    <div v-else-if="error">{{ error }}</div>
    <div v-else-if="user">
      <h2>{{ user.name }}</h2>
      <p>{{ user.email }}</p>
      <p>Role: {{ user.role }}</p>
    </div>
  </div>
</template>
