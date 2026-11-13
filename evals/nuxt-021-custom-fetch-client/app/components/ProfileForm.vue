<script setup lang="ts">
const name = ref('')
const saved = ref(false)
const failed = ref(false)

async function save() {
  saved.value = false
  failed.value = false
  try {
    await $fetch('/api/profile', {
      method: 'PATCH',
      body: { name: name.value }
    })
    saved.value = true
  } catch {
    failed.value = true
  }
}
</script>

<template>
  <form @submit.prevent="save">
    <label>
      Display name
      <input v-model="name" name="name" required>
    </label>
    <button type="submit">Save</button>
    <p v-if="saved">Saved.</p>
    <p v-if="failed">Could not save your profile.</p>
  </form>
</template>
