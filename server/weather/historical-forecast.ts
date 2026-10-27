import { createWeatherTool, forecastSectionsMissing } from './create-weather-tool.ts'
import { forecastOptionalFields } from './fields.ts'
import type { ConversationMemory, OpenMeteoClient } from './types.ts'

export function createHistoricalForecastTool(client: OpenMeteoClient, memory: ConversationMemory) {
  return createWeatherTool({
    name: 'historicalForecast',
    sentenceName: 'historical forecast',
    description: 'Weather tool. What a past forecast said.',
    url: 'https://historical-forecast-api.open-meteo.com/v1/forecast',
    sections: ['current', 'hourly', 'daily'],
    optional: forecastOptionalFields,
    missing: forecastSectionsMissing,
  }, client, memory)
}
