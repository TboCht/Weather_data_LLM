<script setup lang="ts">
import type { ConversationChart } from '../../chart/from-tool-output'

defineProps<{
  chart: ConversationChart
}>()
</script>

<template>
  <LineChart
    :data="chart.data"
    :categories="chart.categories"
    :height="220"
    :x-axis="chart.xAxis"
    :y-label="chart.yLabel"
  />
</template>
