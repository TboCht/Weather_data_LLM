import { Unit } from '@openmeteo/sdk/unit.js'
import type { DecodedLocation, TimedSection, TimedValues, WeatherResponse, WeatherSection } from './types.ts'

const unitLabels: Record<string, string> = {
  celsius: '°C',
  fahrenheit: '°F',
  millimetre: 'mm',
  centimetre: 'cm',
  inch: 'in',
  percentage: '%',
  kilometres_per_hour: 'km/h',
  miles_per_hour: 'mph',
  metre_per_second: 'm/s',
  knots: 'kn',
  hectopascal: 'hPa',
  metre: 'm',
  hours: 'h',
  seconds: 's',
  degree_direction: '°',
  watt_per_square_metre: 'W/m²',
  megajoule_per_square_metre: 'MJ/m²',
  micrograms_per_cubic_metre: 'μg/m³',
  cubic_metre_per_second: 'm³/s',
  european_air_quality_index: 'AQI',
  us_air_quality_index: 'AQI',
  parts_per_million: 'ppm',
  wmo_code: 'WMO',
  dimensionless: '',
  dimensionless_integer: '',
}

export interface RequestedPlace {
  latitude: number
  longitude: number
}

export interface RequestedSections {
  current?: string[]
  hourly?: string[]
  daily?: string[]
}

function unitLabel(unit: number): string {
  const name = Unit[unit]
  if (typeof name !== 'string')
    return ''
  return unitLabels[name] ?? name.replaceAll('_', ' ')
}

function finite(value: number | null): number | null {
  if (typeof value !== 'number' || Number.isNaN(value))
    return null
  return value
}

function readValues(variable: TimedValues, count: number): Array<number | null> | null {
  if (variable.valuesLength() === count) {
    const values: Array<number | null> = []
    for (let index = 0; index < count; index += 1) {
      values.push(finite(variable.values(index)))
    }
    return values
  }
  if (count === 1 && variable.valuesLength() === 0)
    return [finite(variable.value())]
  return null
}

function readSection(
  section: TimedSection | null,
  codes: string[],
  descriptions: Record<string, string>,
): WeatherSection | null {
  if (!section || codes.length === 0 || section.variablesLength() !== codes.length)
    return null

  const first = section.variables(0)
  if (!first)
    return null
  const count = first.valuesLength() > 0 ? first.valuesLength() : 1
  const interval = section.interval()
  if (count > 1 && interval <= 0)
    return null

  const start = Number(section.time())
  if (!Number.isFinite(start))
    return null

  const time: number[] = []
  for (let index = 0; index < count; index += 1)
    time.push(start + index * interval)

  const variables = []
  for (let index = 0; index < codes.length; index += 1) {
    const code = codes[index]
    const decoded = section.variables(index)
    if (!code || !decoded)
      return null
    const values = readValues(decoded, count)
    if (!values)
      return null
    variables.push({
      code,
      description: descriptions[code] ?? code,
      unit: unitLabel(decoded.unit()),
      values,
    })
  }

  return { time, variables }
}

export function mapWeatherResponse(input: {
  decoded: DecodedLocation[]
  requested: RequestedPlace[]
  sections: RequestedSections
  descriptions: Record<string, string>
}): WeatherResponse | null {
  if (input.decoded.length !== input.requested.length || input.requested.length === 0)
    return null

  const locations = []
  for (let index = 0; index < input.requested.length; index += 1) {
    const place = input.requested[index]
    const decoded = input.decoded[index]
    if (!place || !decoded)
      return null

    const location: WeatherResponse['locations'][number] = {
      latitude: place.latitude,
      longitude: place.longitude,
      timezone: decoded.timezone() ?? 'GMT',
      utcOffsetSeconds: decoded.utcOffsetSeconds(),
    }

    if (input.sections.current) {
      const current = readSection(decoded.current(), input.sections.current, input.descriptions)
      if (!current)
        return null
      location.current = current
    }
    if (input.sections.hourly) {
      const hourly = readSection(decoded.hourly(), input.sections.hourly, input.descriptions)
      if (!hourly)
        return null
      location.hourly = hourly
    }
    if (input.sections.daily) {
      const daily = readSection(decoded.daily(), input.sections.daily, input.descriptions)
      if (!daily)
        return null
      location.daily = daily
    }

    locations.push(location)
  }

  return { locations }
}
