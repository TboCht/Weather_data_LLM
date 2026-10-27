import { createWeatherTool, hasSection } from './create-weather-tool.ts'
import { cellSelectionField } from './fields.ts'
import type { ConversationMemory, OpenMeteoClient } from './types.ts'

export function createFloodTool(client: OpenMeteoClient, memory: ConversationMemory) {
  return createWeatherTool({
    name: 'flood',
    sentenceName: 'flood',
    description: 'Weather tool. River discharge.',
    url: 'https://flood-api.open-meteo.com/v1/flood',
    sections: ['daily'],
    optional: [
      { name: 'past_days', kind: 'number', description: 'Number of past days to include.' },
      { name: 'forecast_days', kind: 'number', description: 'Number of forecast days to include.' },
      { name: 'start_date', kind: 'string', description: 'Range start, yyyy-mm-dd.' },
      { name: 'end_date', kind: 'string', description: 'Range end, yyyy-mm-dd.' },
      { name: 'timezone', kind: 'string', description: 'Time zone.' },
      { name: 'ensemble', kind: 'boolean', description: 'When true, all forecast ensemble members are returned.' },
      cellSelectionField,
    ],
    missing: (input) => {
      if (!hasSection(input, 'daily'))
        return 'daily is required.'
      return null
    },
  }, client, memory)
}
