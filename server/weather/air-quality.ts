import { createWeatherTool, hasSection } from './create-weather-tool.ts'
import { cellSelectionField } from './fields.ts'
import type { ConversationMemory, OpenMeteoClient } from './types.ts'

export function createAirQualityTool(client: OpenMeteoClient, memory: ConversationMemory) {
  return createWeatherTool({
    name: 'airQuality',
    sentenceName: 'air quality',
    description: 'Weather tool. Air quality.',
    url: 'https://air-quality-api.open-meteo.com/v1/air-quality',
    sections: ['current', 'hourly'],
    optional: [
      { name: 'past_days', kind: 'number', description: 'Number of past days to include.' },
      { name: 'forecast_days', kind: 'number', description: 'Number of forecast days to include.' },
      { name: 'forecast_hours', kind: 'number', description: 'Limit the forecast to this many hours.' },
      { name: 'past_hours', kind: 'number', description: 'Number of past hours to include.' },
      { name: 'start_date', kind: 'string', description: 'Range start, yyyy-mm-dd.' },
      { name: 'end_date', kind: 'string', description: 'Range end, yyyy-mm-dd.' },
      { name: 'start_hour', kind: 'string', description: 'Hour range start, yyyy-mm-ddThh:mm.' },
      { name: 'end_hour', kind: 'string', description: 'Hour range end, yyyy-mm-ddThh:mm.' },
      { name: 'timezone', kind: 'string', description: 'Time zone.' },
      { name: 'domains', kind: 'string', description: 'auto, cams_europe, or cams_global.' },
      cellSelectionField,
    ],
    missing: (input) => {
      if (!hasSection(input, 'hourly') && !hasSection(input, 'current'))
        return 'hourly or current is required.'
      return null
    },
  }, client, memory)
}
