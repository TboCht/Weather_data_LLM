import { createWeatherTool, forecastSectionsMissing, hasText } from './create-weather-tool.ts'
import { forecastOptionalFields } from './fields.ts'
import type { ConversationMemory, OpenMeteoClient } from './types.ts'

export function createSingleRunsTool(client: OpenMeteoClient, memory: ConversationMemory) {
  return createWeatherTool({
    name: 'singleRuns',
    sentenceName: 'single runs',
    description: 'Weather tool. One model cycle. Pass the run time as run, for example 2024-06-01T00:00.',
    url: 'https://single-runs-api.open-meteo.com/v1/forecast',
    sections: ['current', 'hourly', 'daily'],
    optional: [
      { name: 'run', kind: 'string', description: 'Model run time, for example 2024-06-01T00:00. Required.' },
      ...forecastOptionalFields,
    ],
    missing: (input) => {
      if (!hasText(input, 'run'))
        return 'run is required.'
      return forecastSectionsMissing(input)
    },
  }, client, memory)
}
