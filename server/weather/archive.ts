import { createWeatherTool, hasSection, hasText } from './create-weather-tool.ts'
import { cellSelectionField, elevationField, forecastUnitFields } from './fields.ts'
import type { ConversationMemory, OpenMeteoClient } from './types.ts'

export function createArchiveTool(client: OpenMeteoClient, memory: ConversationMemory) {
  return createWeatherTool({
    name: 'archive',
    sentenceName: 'archive',
    description: 'Weather tool. Measured past weather for a date range.',
    url: 'https://archive-api.open-meteo.com/v1/archive',
    sections: ['hourly', 'daily'],
    optional: [
      elevationField,
      { name: 'start_date', kind: 'string', description: 'Range start, yyyy-mm-dd. Required.' },
      { name: 'end_date', kind: 'string', description: 'Range end, yyyy-mm-dd. Required.' },
      { name: 'timezone', kind: 'string', description: 'Time zone. Required when daily is set.' },
      ...forecastUnitFields,
      cellSelectionField,
    ],
    missing: (input) => {
      if (!hasText(input, 'start_date') || !hasText(input, 'end_date'))
        return 'start_date and end_date are required.'
      if (!hasSection(input, 'hourly') && !hasSection(input, 'daily'))
        return 'hourly or daily is required.'
      if (hasSection(input, 'daily') && !hasText(input, 'timezone'))
        return 'daily requires timezone.'
      return null
    },
  }, client, memory)
}
