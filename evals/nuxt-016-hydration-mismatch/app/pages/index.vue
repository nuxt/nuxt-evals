<script setup lang="ts">
// Capture the time the page was rendered.
const now = new Date().toLocaleTimeString()
</script>

<template>
  <div>
    <h1>Dashboard</h1>
    <p>Page loaded at: {{ now }}</p>
  </div>
</template>
