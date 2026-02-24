<script setup lang="ts">
const theme = ref('light')

onMounted(() => {
  const cookies = document.cookie.split(';')
  const themeCookie = cookies.find(c => c.trim().startsWith('theme='))
  if (themeCookie) {
    theme.value = themeCookie.split('=')[1].trim()
  }
  document.documentElement.classList.toggle('dark', theme.value === 'dark')
})

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  document.cookie = `theme=${theme.value}; path=/; max-age=31536000`
  document.documentElement.classList.toggle('dark', theme.value === 'dark')
}
</script>

<template>
  <div>
    <h1>Settings</h1>

    <div>
      <p>Current theme: {{ theme }}</p>
      <button @click="toggleTheme">
        Switch to {{ theme === 'light' ? 'dark' : 'light' }} mode
      </button>
    </div>
  </div>
</template>
