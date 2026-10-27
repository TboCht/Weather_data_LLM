export interface PlaceMatch {
  name: string
  country_code: string
  latitude: number
  longitude: number
  admin1?: string
  admin2?: string
  country?: string
}

export interface GeocodeNameResult {
  name: string
  matches: PlaceMatch[]
}

export interface WeatherVariable {
  code: string
  description: string
  unit: string
  values: Array<number | null>
}

export interface WeatherSection {
  time: number[]
  variables: WeatherVariable[]
}

export interface WeatherLocation {
  latitude: number
  longitude: number
  timezone: string
  utcOffsetSeconds: number
  current?: WeatherSection
  hourly?: WeatherSection
  daily?: WeatherSection
}

export interface WeatherResponse {
  locations: WeatherLocation[]
}

export interface TimedValues {
  unit: () => number
  value: () => number
  values: (index: number) => number | null
  valuesLength: () => number
}

export interface TimedSection {
  time: () => bigint
  interval: () => number
  variablesLength: () => number
  variables: (index: number) => TimedValues | null
}

export interface DecodedLocation {
  utcOffsetSeconds: () => number
  timezone: () => string | null
  current: () => TimedSection | null
  hourly: () => TimedSection | null
  daily: () => TimedSection | null
}

export interface OpenMeteoClient {
  search: (name: string) => Promise<unknown>
  fetchWeather: (url: string, params: Record<string, string>) => Promise<DecodedLocation[]>
}

export interface ConversationMemory {
  places: PlaceMatch[]
  weather: WeatherResponse | null
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isWeatherResponse(value: unknown): value is WeatherResponse {
  return isRecord(value) && Array.isArray(value.locations)
}
