<script setup lang="ts">
// PROTOTYPE stand-in. One canned temperature series so the chart can sit in the reply.
// Which type, series, and colors a real Weather response should use is not decided here.

const points = Array.from({ length: 24 }, (_, hour) => {
  const temperature = Math.round(11 + 7 * Math.sin(((hour - 8) / 24) * Math.PI * 2))
  return {
    hour: `${hour.toString().padStart(2, '0')}:00`,
    temperature,
  }
})

const categories = {
  temperature: {
    name: 'Temperature',
    color: '#2662d9',
  },
}
</script>

<template>
  <LineChart
    :data="points"
    :categories="categories"
    :height="220"
    x-axis="hour"
    y-label="°C"
  />
</template>
