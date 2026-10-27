import { createWeatherTool, hasModels, hasSection, hasText } from './create-weather-tool.ts'
import { cellSelectionField, forecastUnitFields, modelsField } from './fields.ts'
import type { ConversationMemory, OpenMeteoClient } from './types.ts'

export function createClimateTool(client: OpenMeteoClient, memory: ConversationMemory) {
  return createWeatherTool({
    name: 'climate',
    sentenceName: 'climate',
    description: 'Weather tool. Long-range modeled climate between 1950 and 2050.',
    url: 'https://climate-api.open-meteo.com/v1/climate',
    sections: ['daily'],
    optional: [
      modelsField,
      { name: 'start_date', kind: 'string', description: 'Range start, yyyy-mm-dd. Required.' },
      { name: 'end_date', kind: 'string', description: 'Range end, yyyy-mm-dd. Required.' },
      ...forecastUnitFields,
      { name: 'disable_bias_correction', kind: 'boolean', description: 'Disable bias correction. Default false.' },
      cellSelectionField,
    ],
    missing: (input) => {
      if (!hasModels(input))
        return 'models is required.'
      if (!hasSection(input, 'daily'))
        return 'daily is required.'
      if (!hasText(input, 'start_date') || !hasText(input, 'end_date'))
        return 'start_date and end_date are required.'
      return null
    },
  }, client, memory)
}
