import { jsonSchema, tool } from 'ai'
import type { ConversationMemory } from '../../server/weather/types.ts'
import { isRecord } from '../../server/weather/types.ts'
import { buildChart } from './build.ts'
import { chartGuide } from './guide.ts'

export function createChartTool(memory: ConversationMemory) {
  return tool({
    description: chartGuide,
    inputSchema: jsonSchema<Record<string, unknown>>({
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'line, area, bar, donut, bubble, radar, radial bar, funnel, Sankey, candlestick, status tracker, dotted map, or topojson map.',
        },
        question: {
          type: 'string',
          description: 'The question this chart answers.',
        },
        series: {
          type: 'array',
          description: 'Each series names current, hourly, or daily, a variable code, latitude, longitude, and a color.',
          items: {
            type: 'object',
            properties: {
              section: { type: 'string' },
              variable: { type: 'string' },
              latitude: { type: 'number' },
              longitude: { type: 'number' },
              color: { type: 'string' },
            },
          },
        },
      },
      additionalProperties: true,
    }, {
      validate: (value) => {
        if (!isRecord(value))
          return { success: false, error: new Error('expected an object') }
        return { success: true, value }
      },
    }),
    execute: (input) => {
      for (const key of Object.keys(input)) {
        if (key !== 'type' && key !== 'question' && key !== 'series')
          return `Could not draw the chart: ${key} is not an argument this tool accepts.`
      }
      const built = buildChart({
        type: input.type,
        question: input.question,
        series: input.series,
        weather: memory.weather,
        places: memory.places,
      })
      if (!built.ok)
        return built.sentence
      return built.chart
    },
  })
}
