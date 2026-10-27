import { createWeatherTool, forecastSectionsMissing } from './create-weather-tool.ts'
import { forecastOptionalFields } from './fields.ts'
import type { ConversationMemory, OpenMeteoClient } from './types.ts'

export function createPreviousRunsTool(client: OpenMeteoClient, memory: ConversationMemory) {
  return createWeatherTool({
    name: 'previousRuns',
    sentenceName: 'previous runs',
    description: 'Weather tool. A forecast labeled by lead time. Hourly codes may end in _previous_day1 through _previous_day7.',
    url: 'https://previous-runs-api.open-meteo.com/v1/forecast',
    sections: ['current', 'hourly', 'daily'],
    optional: forecastOptionalFields,
    missing: forecastSectionsMissing,
  }, client, memory)
}
