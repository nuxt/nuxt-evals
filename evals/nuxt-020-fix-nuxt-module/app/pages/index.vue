<script setup lang="ts">
const { data: order } = await useFetch('/api/track')
const config = useRuntimeConfig()
</script>

<template>
  <main>
    <h1>Orders</h1>
    <Chart />
    <p>{{ order?.orderId }} ({{ order?.status }})</p>
    <p>site: {{ config.public.beacon?.siteId }}</p>
  </main>
</template>
