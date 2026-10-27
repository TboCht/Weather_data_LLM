import { createWeatherTool, hasSection } from './create-weather-tool.ts'
import { forecastOptionalFields } from './fields.ts'
import type { ConversationMemory, OpenMeteoClient } from './types.ts'

export function createSeasonalTool(client: OpenMeteoClient, memory: ConversationMemory) {
  return createWeatherTool({
    name: 'seasonal',
    sentenceName: 'seasonal',
    description: 'Weather tool. A seasonal outlook.',
    url: 'https://seasonal-api.open-meteo.com/v1/seasonal',
    sections: ['hourly', 'daily'],
    optional: forecastOptionalFields,
    missing: (input) => {
      if (!hasSection(input, 'daily'))
        return 'daily is required.'
      return null
    },
  }, client, memory)
}
