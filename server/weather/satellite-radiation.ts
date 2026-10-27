import { createWeatherTool, hasModels, hasSection, hasText } from './create-weather-tool.ts'
import { modelsField } from './fields.ts'
import type { ConversationMemory, OpenMeteoClient } from './types.ts'

export function createSatelliteRadiationTool(client: OpenMeteoClient, memory: ConversationMemory) {
  return createWeatherTool({
    name: 'satelliteRadiation',
    sentenceName: 'satellite radiation',
    description: 'Weather tool. Satellite radiation.',
    url: 'https://satellite-api.open-meteo.com/v1/archive',
    sections: ['hourly', 'daily'],
    optional: [
      modelsField,
      { name: 'temporal_resolution', kind: 'string', description: 'Time step, for example native. Required.' },
      { name: 'start_date', kind: 'string', description: 'Range start, yyyy-mm-dd.' },
      { name: 'end_date', kind: 'string', description: 'Range end, yyyy-mm-dd.' },
      { name: 'timezone', kind: 'string', description: 'Time zone.' },
    ],
    missing: (input) => {
      if (!hasSection(input, 'hourly'))
        return 'hourly is required.'
      if (!hasModels(input))
        return 'models is required.'
      if (!hasText(input, 'temporal_resolution'))
        return 'temporal_resolution is required.'
      return null
    },
  }, client, memory)
}
