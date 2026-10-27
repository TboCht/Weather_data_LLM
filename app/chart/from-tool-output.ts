import type { ConversationChart } from './types.ts'

export type { ConversationChart } from './types.ts'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const chartTypes = new Set([
  'line',
  'area',
  'bar',
  'donut',
  'radial-bar',
  'funnel',
  'radar',
  'bubble',
  'candlestick',
  'status-tracker',
  'sankey',
  'dotted-map',
  'topojson-map',
])

export function chartFromToolOutput(output: unknown): ConversationChart | null {
  if (!isRecord(output) || typeof output.type !== 'string' || typeof output.question !== 'string')
    return null
  if (!chartTypes.has(output.type))
    return null
  if (output.type === 'line' || output.type === 'area' || output.type === 'bar') {
    if (!Array.isArray(output.data) || output.data.length === 0 || !isRecord(output.categories) || typeof output.xAxis !== 'string')
      return null
  }
  if (output.type === 'candlestick' && !Array.isArray(output.sets))
    return null
  if (output.type === 'sankey' && (!Array.isArray(output.nodes) || !Array.isArray(output.links)))
    return null
  if (output.type === 'dotted-map' && !Array.isArray(output.pins))
    return null
  if (output.type === 'topojson-map' && !Array.isArray(output.points))
    return null
  return output as unknown as ConversationChart
}
