import { jsonSchema, tool } from 'ai'
import type { JSONSchema7 } from '@ai-sdk/provider'
import { mapWeatherResponse } from './map-response.ts'
import type { WeatherField } from './fields.ts'
import { variableCatalog, type VariableSectionName } from './variable-catalog.ts'
import {
  isRecord,
  type ConversationMemory,
  type OpenMeteoClient,
} from './types.ts'

export interface WeatherToolSpec {
  name: string
  sentenceName: string
  description: string
  url: string
  sections: VariableSectionName[]
  optional: WeatherField[]
  missing: (input: Record<string, unknown>) => string | null
}

const blockedArguments = new Set(['format', 'apikey', 'timeformat'])
const sectionNames = new Set(['current', 'hourly', 'daily', 'minutely_15'])

function sentence(spec: WeatherToolSpec, detail: string) {
  return `Could not fetch the ${spec.sentenceName}: ${detail}`
}

function stringList(value: unknown): string[] | null {
  if (typeof value === 'string' && value !== '')
    return [value]
  if (!Array.isArray(value) || value.length === 0)
    return null
  if (!value.every(item => typeof item === 'string' && item !== ''))
    return null
  return value
}

function numberList(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0)
    return null
  if (!value.every(item => typeof item === 'number' && Number.isFinite(item)))
    return null
  return value
}

function acceptsField(value: unknown, kind: WeatherField['kind']) {
  if (kind === 'number')
    return typeof value === 'number' && Number.isFinite(value)
  if (kind === 'string')
    return typeof value === 'string' && value !== ''
  if (kind === 'boolean')
    return typeof value === 'boolean'
  return stringList(value) !== null
}

function schemaFor(spec: WeatherToolSpec): JSONSchema7 {
  const properties: Record<string, JSONSchema7> = {
    latitude: {
      type: 'array',
      items: { type: 'number' },
      description: 'Latitudes, one per place, in the same order as longitude.',
    },
    longitude: {
      type: 'array',
      items: { type: 'number' },
      description: 'Longitudes, one per place, in the same order as latitude.',
    },
  }
  const catalog = variableCatalog[spec.name] ?? {}
  for (const section of spec.sections) {
    const listings = catalog[section] ?? []
    properties[section] = {
      type: 'array',
      items: { type: 'string' },
      description: listings.map(item => `${item.code}: ${item.description}`).join('\n'),
    }
  }
  for (const field of spec.optional) {
    const schema: JSONSchema7 = field.kind === 'number'
      ? { type: 'number', description: field.description }
      : field.kind === 'boolean'
        ? { type: 'boolean', description: field.description }
        : field.kind === 'stringArray'
          ? { type: 'array', items: { type: 'string' }, description: field.description }
          : { type: 'string', description: field.description }
    properties[field.name] = schema
  }
  return { type: 'object', properties, additionalProperties: true }
}

function descriptionsFor(spec: WeatherToolSpec, sections: Partial<Record<VariableSectionName, string[]>>) {
  const catalog = variableCatalog[spec.name] ?? {}
  const descriptions: Record<string, string> = {}
  for (const section of spec.sections) {
    const codes = sections[section]
    if (!codes)
      continue
    const listings = new Map((catalog[section] ?? []).map(item => [item.code, item.description]))
    for (const code of codes) {
      const description = listings.get(code)
      if (description)
        descriptions[code] = description
    }
  }
  return descriptions
}

function knownCodes(spec: WeatherToolSpec, section: VariableSectionName) {
  return new Set((variableCatalog[spec.name]?.[section] ?? []).map(item => item.code))
}

export function createWeatherTool(spec: WeatherToolSpec, client: OpenMeteoClient, memory: ConversationMemory) {
  const allowed = new Set([
    'latitude',
    'longitude',
    ...spec.sections,
    ...spec.optional.map(field => field.name),
  ])

  return tool({
    description: spec.description,
    inputSchema: jsonSchema<Record<string, unknown>>(schemaFor(spec), {
      validate: (value) => {
        if (!isRecord(value))
          return { success: false, error: new Error('expected an object') }
        return { success: true, value }
      },
    }),
    execute: async (input) => {
      for (const key of Object.keys(input)) {
        if (allowed.has(key))
          continue
        if (sectionNames.has(key))
          return sentence(spec, `${key} is not a section this tool accepts.`)
        if (blockedArguments.has(key) || !allowed.has(key))
          return sentence(spec, `${key} is not an argument this tool accepts.`)
      }

      const latitude = numberList(input.latitude)
      const longitude = numberList(input.longitude)
      if (!latitude || !longitude)
        return sentence(spec, 'latitude and longitude must be equal-length arrays of coordinates.')
      if (latitude.length !== longitude.length)
        return sentence(spec, 'latitude and longitude must be equal-length arrays of coordinates.')

      for (const key of Object.keys(input)) {
        if (spec.sections.includes(key as VariableSectionName))
          continue
        if (key === 'latitude' || key === 'longitude')
          continue
        const field = spec.optional.find(item => item.name === key)
        if (field && !acceptsField(input[key], field.kind))
          return sentence(spec, `${key} is not an argument this tool accepts.`)
      }

      const sections: Partial<Record<VariableSectionName, string[]>> = {}
      for (const key of Object.keys(input)) {
        if (!spec.sections.includes(key as VariableSectionName))
          continue
        const codes = stringList(input[key])
        if (!codes)
          return sentence(spec, `${key} must be a list of variable codes.`)
        const known = knownCodes(spec, key as VariableSectionName)
        for (const code of codes) {
          if (!known.has(code))
            return sentence(spec, `${code} is not a code this tool accepts.`)
        }
        sections[key as VariableSectionName] = codes
      }

      const missing = spec.missing(input)
      if (missing)
        return sentence(spec, missing)

      const params: Record<string, string> = {
        latitude: latitude.join(','),
        longitude: longitude.join(','),
      }
      for (const section of spec.sections) {
        const codes = sections[section]
        if (codes)
          params[section] = codes.join(',')
      }
      for (const field of spec.optional) {
        const value = input[field.name]
        if (value === undefined)
          continue
        if (field.kind === 'stringArray')
          params[field.name] = stringList(value)?.join(',') ?? ''
        else
          params[field.name] = String(value)
      }

      try {
        const decoded = await client.fetchWeather(spec.url, params)
        const weather = mapWeatherResponse({
          decoded,
          requested: latitude.map((value, index) => ({
            latitude: value,
            longitude: longitude[index] ?? value,
          })),
          sections,
          descriptions: descriptionsFor(spec, sections),
        })
        if (!weather)
          return sentence(spec, 'the Open-Meteo response could not be mapped.')
        memory.weather = weather
        return weather
      }
      catch (error) {
        const detail = error instanceof Error && error.message
          ? error.message
          : 'the Open-Meteo request failed.'
        return sentence(spec, detail.endsWith('.') ? detail : `${detail}.`)
      }
    },
  })
}

export function hasSection(input: Record<string, unknown>, section: VariableSectionName) {
  const value = input[section]
  if (typeof value === 'string')
    return value !== ''
  return Array.isArray(value) && value.length > 0
}

export function hasText(input: Record<string, unknown>, key: string) {
  return typeof input[key] === 'string' && input[key] !== ''
}

export function hasModels(input: Record<string, unknown>) {
  return stringList(input.models) !== null
}

export function forecastSectionsMissing(input: Record<string, unknown>) {
  if (!hasSection(input, 'current') && !hasSection(input, 'hourly') && !hasSection(input, 'daily'))
    return 'one of current, hourly, or daily is required.'
  if (hasSection(input, 'daily') && !hasText(input, 'timezone'))
    return 'daily requires timezone.'
  return null
}
