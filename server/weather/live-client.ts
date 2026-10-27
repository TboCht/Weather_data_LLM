import { fetchWeatherApi } from 'openmeteo'
import type { OpenMeteoClient } from './types.ts'

export const liveOpenMeteo: OpenMeteoClient = {
  async search(name) {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
    url.searchParams.set('name', name)
    url.searchParams.set('count', '10')
    url.searchParams.set('language', 'en')
    url.searchParams.set('format', 'json')
    const response = await fetch(url)
    if (!response.ok)
      throw new Error(`Could not geocode: Open-Meteo returned ${response.status}.`)
    return response.json()
  },
  fetchWeather(url, params) {
    return fetchWeatherApi(url, params)
  },
}
