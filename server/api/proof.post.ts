import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText, tool } from 'ai'
import { fetchWeatherApi } from 'openmeteo'
import { z } from 'zod'

const proofLatitude = 52.52
const proofLongitude = 13.41

const toolInputSchema = z.object({
  forecastHours: z.literal(24),
})

const hourlyForecastSchema = z.object({
  timezone: z.string(),
  utcOffsetSeconds: z.number().int(),
  intervalSeconds: z.literal(3600),
  time: z.array(z.number().int()).length(24),
  temperature: z.array(z.number()).length(24),
  unit: z.literal(1),
})

type HourlyForecast = z.infer<typeof hourlyForecastSchema>

function messageFromBody(body: unknown): string {
  if (typeof body !== 'object' || body === null || !('message' in body)) {
    return ''
  }

  const message = body.message
  return typeof message === 'string' ? message.trim() : ''
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

function unixHours(start: number, end: number, interval: number): number[] {
  if (!Number.isFinite(interval) || interval <= 0) {
    return []
  }

  const count = (end - start) / interval
  if (!Number.isInteger(count) || count < 0) {
    return []
  }

  return Array.from({ length: count }, (_, index) => start + index * interval)
}

async function loadHourlyForecast(forecastHours: 24): Promise<HourlyForecast> {
  const responses = await fetchWeatherApi('https://api.open-meteo.com/v1/forecast', {
    latitude: [proofLatitude],
    longitude: [proofLongitude],
    hourly: 'temperature_2m',
    forecast_hours: forecastHours,
    timezone: 'auto',
  })

  const response = responses[0]
  const hourly = response?.hourly()
  const variable = hourly?.variables(0)
  if (!response || !hourly || !variable) {
    throw new Error('Open-Meteo returned no hourly temperature forecast')
  }

  const values = variable.valuesArray()
  return hourlyForecastSchema.parse({
    timezone: response.timezone(),
    utcOffsetSeconds: response.utcOffsetSeconds(),
    intervalSeconds: hourly.interval(),
    time: unixHours(Number(hourly.time()), Number(hourly.timeEnd()), hourly.interval()),
    temperature: values === null ? null : Array.from(values),
    unit: variable.unit(),
  })
}

export default defineEventHandler(async (event) => {
  const message = messageFromBody(await readBody(event))
  if (!message) {
    return { ok: false as const, error: 'Enter a message before sending.' }
  }

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (typeof anthropicApiKey !== 'string' || anthropicApiKey.length === 0) {
    return {
      ok: false as const,
      error: 'NUXT_ANTHROPIC_API_KEY is missing. Add it to the gitignored env file.',
    }
  }

  try {
    const anthropic = createAnthropic({ apiKey: anthropicApiKey })
    const result = await generateText({
      model: anthropic('claude-haiku-5-5'),
      system: 'Call the weather tool once. Set forecastHours to 24. Do not invent temperatures.',
      prompt: message,
      tools: {
        weather: tool({
          description: 'Fetch the next 24 hourly temperatures for the fixed proof coordinate. forecastHours must be 24.',
          inputSchema: toolInputSchema,
          execute: async ({ forecastHours }) => loadHourlyForecast(forecastHours),
        }),
      },
    })

    for (const part of result.content) {
      if (part.type === 'tool-error') {
        return { ok: false as const, error: errorText(part.error, 'Weather tool failed') }
      }
    }

    const output = result.staticToolResults[0]?.output
    if (!output) {
      return { ok: false as const, error: 'The model did not return a weather tool result.' }
    }

    return { ok: true as const, output }
  }
  catch (error) {
    return { ok: false as const, error: errorText(error, 'Model call failed') }
  }
})
