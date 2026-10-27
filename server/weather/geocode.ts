import { jsonSchema, tool } from 'ai'
import type { ConversationMemory, GeocodeNameResult, OpenMeteoClient, PlaceMatch } from './types.ts'
import { isRecord } from './types.ts'

function optionalText(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return typeof value === 'string' && value !== '' ? value : undefined
}

export function placeMatchesFromSearch(body: unknown): PlaceMatch[] {
  if (!isRecord(body) || !Array.isArray(body.results))
    return []

  const matches: PlaceMatch[] = []
  for (const result of body.results) {
    if (!isRecord(result))
      continue
    if (typeof result.name !== 'string' || typeof result.country_code !== 'string')
      continue
    if (typeof result.latitude !== 'number' || typeof result.longitude !== 'number')
      continue
    const match: PlaceMatch = {
      name: result.name,
      country_code: result.country_code,
      latitude: result.latitude,
      longitude: result.longitude,
    }
    const admin1 = optionalText(result, 'admin1')
    const admin2 = optionalText(result, 'admin2')
    const country = optionalText(result, 'country')
    if (admin1)
      match.admin1 = admin1
    if (admin2)
      match.admin2 = admin2
    if (country)
      match.country = country
    matches.push(match)
    if (matches.length === 10)
      break
  }
  return matches
}

export async function geocodePlaces(names: string[], client: OpenMeteoClient): Promise<GeocodeNameResult[]> {
  const results: GeocodeNameResult[] = []
  for (const name of names) {
    const body = await client.search(name)
    results.push({ name, matches: placeMatchesFromSearch(body).slice(0, 10) })
  }
  return results
}

export function createGeocodeTool(client: OpenMeteoClient, memory: ConversationMemory) {
  return tool({
    description: [
      'Geocode tool. Look up one or more written place names in a single call.',
      'Each name returns up to 10 place matches, or an empty list.',
      'A match has name, country_code, latitude, and longitude, plus admin1, admin2, and country when Open-Meteo sent them.',
      'Pass latitude and longitude onward. Do not pass the place name or a geocoding id.',
      'An empty match list means that name matched nothing. Say so in plain language and suggest a city and country, such as Paris, France.',
    ].join(' '),
    inputSchema: jsonSchema<Record<string, unknown>>({
      type: 'object',
      properties: {
        names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Written place names to look up together.',
        },
      },
      additionalProperties: true,
    }, {
      validate: (value) => {
        if (!isRecord(value))
          return { success: false, error: new Error('expected an object') }
        return { success: true, value }
      },
    }),
    execute: async (input) => {
      for (const key of Object.keys(input)) {
        if (key !== 'names')
          return `Could not geocode: ${key} is not an argument this tool accepts.`
      }
      if (!Array.isArray(input.names) || input.names.length === 0 || input.names.some(name => typeof name !== 'string' || name === ''))
        return 'Could not geocode: names must be a list of written place names.'
      const results = await geocodePlaces(input.names, client)
      for (const result of results)
        memory.places.push(...result.matches)
      return results
    },
  })
}
