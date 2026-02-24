<script setup lang="ts">
const { count, increment, decrement } = useCounter()
const { data } = await useFetch('/api/hello')
</script>

<template>
  <div>
    <h2>Home</h2>
    <p>{{ data?.message }}</p>
    <div>
      <p>Count: {{ count }}</p>
      <button @click="decrement">-</button>
      <button @click="increment">+</button>
    </div>
  </div>
</template>
