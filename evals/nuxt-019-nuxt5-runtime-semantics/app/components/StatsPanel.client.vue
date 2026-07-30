<script setup lang="ts">
const stats = ref({ visitors: 1284, signups: 37 })
</script>

<template>
  <section>
    <h2>Traffic</h2>
    <p>{{ stats.visitors }} visitors</p>
    <p>{{ stats.signups }} signups</p>
  </section>
</template>
