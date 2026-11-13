<script setup lang="ts">
const { data: me, error: meError } = await useFetch('/api/me')
const { data: orders, status } = await useFetch('/api/orders')
</script>

<template>
  <main>
    <h1>Dashboard</h1>
    <p v-if="meError">Could not load your account.</p>
    <p v-else-if="me">Signed in as {{ me.name }}</p>

    <h2>Recent orders</h2>
    <p v-if="status === 'pending'">Loading orders...</p>
    <ul v-else-if="orders">
      <li v-for="order in orders" :key="order.id">
        #{{ order.id }} · {{ order.total }} €
      </li>
    </ul>
  </main>
</template>
