export interface ConversationChart {
  data: Array<Record<string, string | number>>
  categories: Record<string, { name: string, color?: string }>
  xAxis: string
  yLabel?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function chartFromToolOutput(output: unknown): ConversationChart | null {
  if (!isRecord(output) || output.type !== 'line' || !Array.isArray(output.data) || output.data.length === 0)
    return null
  if (!isRecord(output.categories) || typeof output.xAxis !== 'string' || output.xAxis === '')
    return null

  const data: ConversationChart['data'] = []
  for (const row of output.data) {
    if (!isRecord(row))
      return null
    const point: Record<string, string | number> = {}
    for (const [key, value] of Object.entries(row)) {
      if (typeof value !== 'string' && typeof value !== 'number')
        return null
      point[key] = value
    }
    data.push(point)
  }

  const categories: ConversationChart['categories'] = {}
  for (const [key, value] of Object.entries(output.categories)) {
    if (!isRecord(value) || typeof value.name !== 'string')
      return null
    const category: { name: string, color?: string } = { name: value.name }
    if (typeof value.color === 'string')
      category.color = value.color
    categories[key] = category
  }

  const chart: ConversationChart = {
    data,
    categories,
    xAxis: output.xAxis,
  }
  if (typeof output.yLabel === 'string')
    chart.yLabel = output.yLabel
  return chart
}
