import type { LanguageModel, UIMessage } from 'ai'
import { convertToModelMessages, stepCountIs, streamText } from 'ai'
import { createChartTool } from '../../app/chart/tool.ts'
import { createAirQualityTool } from '../weather/air-quality.ts'
import { createArchiveTool } from '../weather/archive.ts'
import { createClimateTool } from '../weather/climate.ts'
import { createEnsembleTool } from '../weather/ensemble.ts'
import { createFloodTool } from '../weather/flood.ts'
import { createForecastTool } from '../weather/forecast.ts'
import { createGeocodeTool } from '../weather/geocode.ts'
import { createHistoricalForecastTool } from '../weather/historical-forecast.ts'
import { createMarineTool } from '../weather/marine.ts'
import { createPreviousRunsTool } from '../weather/previous-runs.ts'
import { createSatelliteRadiationTool } from '../weather/satellite-radiation.ts'
import { createSeasonalTool } from '../weather/seasonal.ts'
import { createSingleRunsTool } from '../weather/single-runs.ts'
import {
  isRecord,
  isWeatherResponse,
  type ConversationMemory,
  type OpenMeteoClient,
  type PlaceMatch,
} from '../weather/types.ts'
import { projectBriefing } from './briefing.ts'

const weatherToolNames = [
  'forecast',
  'archive',
  'historicalForecast',
  'previousRuns',
  'singleRuns',
  'ensemble',
  'marine',
  'airQuality',
  'flood',
  'climate',
  'seasonal',
  'satelliteRadiation',
] as const

function rememberPlaces(memory: ConversationMemory, output: unknown) {
  if (!Array.isArray(output))
    return
  for (const group of output) {
    if (!isRecord(group) || !Array.isArray(group.matches))
      continue
    for (const match of group.matches) {
      if (!isRecord(match))
        continue
      if (typeof match.name !== 'string' || typeof match.country_code !== 'string')
        continue
      if (typeof match.latitude !== 'number' || typeof match.longitude !== 'number')
        continue
      const place: PlaceMatch = {
        name: match.name,
        country_code: match.country_code,
        latitude: match.latitude,
        longitude: match.longitude,
      }
      if (typeof match.admin1 === 'string')
        place.admin1 = match.admin1
      if (typeof match.admin2 === 'string')
        place.admin2 = match.admin2
      if (typeof match.country === 'string')
        place.country = match.country
      memory.places.push(place)
    }
  }
}

function rememberMessage(memory: ConversationMemory, message: UIMessage) {
  if (message.role !== 'assistant')
    return
  for (const part of message.parts) {
    if (part.type === 'tool-geocode' && part.state === 'output-available')
      rememberPlaces(memory, part.output)
    if (!part.type.startsWith('tool-') || part.type === 'tool-geocode' || part.type === 'tool-chart')
      continue
    if (!('state' in part) || part.state !== 'output-available' || !('output' in part))
      continue
    if (isWeatherResponse(part.output))
      memory.weather = part.output
  }
}

export async function streamConversation(input: {
  messages: UIMessage[]
  model: LanguageModel
  openMeteo: OpenMeteoClient
}) {
  const memory: ConversationMemory = { places: [], weather: null }
  for (const message of input.messages)
    rememberMessage(memory, message)

  const tools = {
    geocode: createGeocodeTool(input.openMeteo, memory),
    forecast: createForecastTool(input.openMeteo, memory),
    archive: createArchiveTool(input.openMeteo, memory),
    historicalForecast: createHistoricalForecastTool(input.openMeteo, memory),
    previousRuns: createPreviousRunsTool(input.openMeteo, memory),
    singleRuns: createSingleRunsTool(input.openMeteo, memory),
    ensemble: createEnsembleTool(input.openMeteo, memory),
    marine: createMarineTool(input.openMeteo, memory),
    airQuality: createAirQualityTool(input.openMeteo, memory),
    flood: createFloodTool(input.openMeteo, memory),
    climate: createClimateTool(input.openMeteo, memory),
    seasonal: createSeasonalTool(input.openMeteo, memory),
    satelliteRadiation: createSatelliteRadiationTool(input.openMeteo, memory),
    chart: createChartTool(memory),
  }

  return streamText({
    model: input.model,
    system: projectBriefing,
    messages: await convertToModelMessages(input.messages, { tools }),
    tools,
    stopWhen: stepCountIs(8),
    providerOptions: {
      anthropic: {
        thinking: { type: 'enabled', budgetTokens: 2048 },
      },
    },
    prepareStep: () => ({
      activeTools: memory.weather
        ? ['geocode', ...weatherToolNames, 'chart']
        : ['geocode', ...weatherToolNames],
    }),
  })
}
