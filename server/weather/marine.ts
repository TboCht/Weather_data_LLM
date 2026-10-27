import { createWeatherTool, forecastSectionsMissing } from './create-weather-tool.ts'
import { cellSelectionField, forecastTimeFields } from './fields.ts'
import type { ConversationMemory, OpenMeteoClient } from './types.ts'

export function createMarineTool(client: OpenMeteoClient, memory: ConversationMemory) {
  return createWeatherTool({
    name: 'marine',
    sentenceName: 'marine',
    description: 'Weather tool. Waves and other marine data.',
    url: 'https://marine-api.open-meteo.com/v1/marine',
    sections: ['current', 'hourly', 'daily'],
    optional: [
      ...forecastTimeFields,
      { name: 'length_unit', kind: 'string', description: 'metric or imperial.' },
      cellSelectionField,
    ],
    missing: forecastSectionsMissing,
  }, client, memory)
}
