<script setup lang="ts">
// SUPPORTED_CURRENCIES is auto-imported from app/utils/currency.ts
const currencies = SUPPORTED_CURRENCIES
</script>

<template>
  <div>
    <h1>Supported currencies</h1>
    <ul>
      <li v-for="code in currencies" :key="code">{{ code }}</li>
    </ul>
  </div>
</template>
