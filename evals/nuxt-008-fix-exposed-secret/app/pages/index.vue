<script setup lang="ts">
const config = useRuntimeConfig()
</script>

<template>
  <div>
    <h1>{{ config.public.appName }}</h1>
    <p>API Status: {{ config.apiSecret ? 'Connected' : 'Not connected' }}</p>
  </div>
</template>
