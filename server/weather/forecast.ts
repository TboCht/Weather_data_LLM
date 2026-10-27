import { createWeatherTool, forecastSectionsMissing } from './create-weather-tool.ts'
import { forecastOptionalFields } from './fields.ts'
import type { ConversationMemory, OpenMeteoClient } from './types.ts'

export function createForecastTool(client: OpenMeteoClient, memory: ConversationMemory) {
  return createWeatherTool({
    name: 'forecast',
    sentenceName: 'forecast',
    description: 'Weather tool. Upcoming or recent weather from the forecast source. A named model such as GFS is the models argument on this tool.',
    url: 'https://api.open-meteo.com/v1/forecast',
    sections: ['current', 'hourly', 'daily'],
    optional: forecastOptionalFields,
    missing: forecastSectionsMissing,
  }, client, memory)
}
