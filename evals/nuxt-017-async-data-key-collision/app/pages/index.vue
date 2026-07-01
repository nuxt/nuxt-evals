<script setup lang="ts">
const { data: products } = await useAsyncData('data', () => $fetch('/api/products'))
const { data: categories } = await useAsyncData('data', () => $fetch('/api/categories'))
</script>

<template>
  <div>
    <section>
      <h2>Products</h2>
      <ul>
        <li v-for="p in products" :key="p.id">{{ p.name }}</li>
      </ul>
    </section>

    <section>
      <h2>Categories</h2>
      <ul>
        <li v-for="c in categories" :key="c.id">{{ c.name }}</li>
      </ul>
    </section>
  </div>
</template>
