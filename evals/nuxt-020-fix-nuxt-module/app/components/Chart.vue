<script setup lang="ts">
const revenue = ref([12, 18, 9, 24, 30, 21, 27])
</script>

<template>
  <ul class="revenue-chart">
    <li
      v-for="(value, i) in revenue"
      :key="i"
    >
      {{ value }}
    </li>
  </ul>
</template>
