<script setup lang="ts">
import type { ConversationChart } from '../../chart/types'

defineProps<{
  chart: ConversationChart
}>()

function barSeries(chart: Extract<ConversationChart, { type: 'line' | 'area' | 'bar' }>) {
  return Object.keys(chart.categories) as unknown as never[]
}

function bubbleRows(chart: Extract<ConversationChart, { type: 'bubble' }>) {
  return chart.data as unknown as Array<Record<string, unknown>>
}

function bubbleNumber(key: 'x' | 'y' | 'size') {
  return (row: Record<string, unknown>) => typeof row[key] === 'number' ? row[key] : null
}

function timeTickCount(count: number) {
  if (count <= 12)
    return undefined
  return 8
}
</script>

<template>
  <LineChart
    v-if="chart.type === 'line'"
    :data="chart.data"
    :categories="chart.categories"
    :height="220"
    :x-axis="chart.xAxis"
    :x-num-ticks="chart.xAxis === 'time' ? timeTickCount(chart.data.length) : undefined"
    :y-label="chart.yLabel"
    :y-domain="chart.yDomain"
    :y-axes="chart.yAxes"
  />
  <AreaChart
    v-else-if="chart.type === 'area'"
    :data="chart.data"
    :categories="chart.categories"
    :height="220"
    :x-axis="chart.xAxis"
    :x-num-ticks="chart.xAxis === 'time' ? timeTickCount(chart.data.length) : undefined"
    :y-label="chart.yLabel"
    :y-domain="chart.yDomain"
    :y-axes="chart.yAxes"
  />
  <BarChart
    v-else-if="chart.type === 'bar'"
    :data="chart.data"
    :categories="chart.categories"
    :height="220"
    :x-axis="chart.xAxis"
    :x-num-ticks="chart.xAxis === 'time' ? timeTickCount(chart.data.length) : undefined"
    :y-axis="barSeries(chart)"
    :y-label="chart.yLabel"
    :y-domain="chart.yDomain"
    :y-axes="chart.yAxes"
  />
  <DonutChart
    v-else-if="chart.type === 'donut'"
    :data="chart.data"
    :categories="chart.categories"
    :name-key="chart.nameKey"
    :value-key="chart.valueKey"
    :height="220"
  />
  <RadialBarChart
    v-else-if="chart.type === 'radial-bar'"
    :data="chart.data"
    :categories="chart.categories"
    :name-key="chart.nameKey"
    :value-key="chart.valueKey"
    :height="220"
  />
  <FunnelChart
    v-else-if="chart.type === 'funnel'"
    :data="chart.data"
    :categories="chart.categories"
    :name-key="chart.nameKey"
    :value-key="chart.valueKey"
    :height="220"
  />
  <RadarChart
    v-else-if="chart.type === 'radar'"
    :data="chart.data"
    :categories="chart.categories"
    :data-key="chart.dataKey"
    :height="220"
  />
  <BubbleChart
    v-else-if="chart.type === 'bubble'"
    :data="bubbleRows(chart)"
    :categories="chart.categories"
    :x-accessor="bubbleNumber('x')"
    :y-accessor="bubbleNumber('y')"
    :size-accessor="bubbleNumber('size')"
    :category-key="chart.categoryKey"
    :height="220"
  />
  <div
    v-else-if="chart.type === 'candlestick'"
    class="flex flex-col gap-3"
  >
    <CandlestickChart
      v-for="set in chart.sets"
      :key="set.name"
      :data="set.data"
      :height="220"
      :up-color="set.color"
      :down-color="set.color"
    />
  </div>
  <StatusTrackerChart
    v-else-if="chart.type === 'status-tracker'"
    :data="chart.data"
    :categories="chart.categories"
  />
  <SankeyChart
    v-else-if="chart.type === 'sankey'"
    :data="{ nodes: chart.nodes, links: chart.links }"
    :height="220"
  />
  <DottedMap
    v-else-if="chart.type === 'dotted-map'"
    :pins="chart.pins"
    :height="220"
  />
  <TopoJSONMap
    v-else-if="chart.type === 'topojson-map'"
    :data="{ points: chart.points }"
    :height="220"
    show-point-labels
  />
</template>
