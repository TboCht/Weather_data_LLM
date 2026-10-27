import { createWeatherTool, hasModels, hasSection } from './create-weather-tool.ts'
import { cellSelectionField, elevationField, forecastTimeFields, forecastUnitFields, modelsField } from './fields.ts'
import type { ConversationMemory, OpenMeteoClient } from './types.ts'

export function createEnsembleTool(client: OpenMeteoClient, memory: ConversationMemory) {
  return createWeatherTool({
    name: 'ensemble',
    sentenceName: 'ensemble',
    description: 'Weather tool. Many members of one model, as a spread rather than one line.',
    url: 'https://ensemble-api.open-meteo.com/v1/ensemble',
    sections: ['hourly'],
    optional: [
      modelsField,
      elevationField,
      ...forecastTimeFields,
      ...forecastUnitFields,
      cellSelectionField,
    ],
    missing: (input) => {
      if (!hasModels(input))
        return 'models is required.'
      if (!hasSection(input, 'hourly'))
        return 'hourly is required.'
      return null
    },
  }, client, memory)
}
