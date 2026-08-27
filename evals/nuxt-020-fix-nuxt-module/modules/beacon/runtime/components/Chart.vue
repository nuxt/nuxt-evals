<script setup lang="ts">
const props = defineProps<{ points?: number[] }>()

const bars = computed(() => props.points ?? [4, 9, 6, 12, 8])
</script>

<template>
  <div class="beacon-chart">
    <span
      v-for="(bar, i) in bars"
      :key="i"
      :style="{ height: `${bar * 4}px` }"
    />
  </div>
</template>
