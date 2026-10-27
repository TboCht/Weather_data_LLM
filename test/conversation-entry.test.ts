import assert from 'node:assert/strict'
import test from 'node:test'
import { Unit } from '@openmeteo/sdk/unit.js'
import type { LanguageModelV3StreamPart, UIMessage } from 'ai'
import { getToolName, isToolUIPart, readUIMessageStream, simulateReadableStream } from 'ai'
import { MockLanguageModelV3 } from 'ai/test'
import { conversationRows, toolActivityLabel } from '../app/components/chat/conversation-rows.ts'
import { streamConversation } from '../server/chat/open-conversation.ts'
import type { DecodedLocation, OpenMeteoClient } from '../server/weather/types.ts'

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
}

const paris = {
  name: 'Paris',
  country_code: 'FR',
  latitude: 48.86,
  longitude: 2.35,
  admin1: 'Île-de-France',
  country: 'France',
}

const lyon = {
  name: 'Lyon',
  country_code: 'FR',
  latitude: 45.75,
  longitude: 4.85,
  admin1: 'Auvergne-Rhône-Alpes',
  country: 'France',
}

interface ScriptStep {
  text?: string
  toolName?: string
  input?: unknown
}

function scriptedModel(respond: (call: {
  index: number
  tools: Array<{ name: string, description?: string }>
}) => ScriptStep) {
  const calls: Array<{ tools: Array<{ name: string, description?: string }> }> = []
  const model = new MockLanguageModelV3({
    doStream: async (options) => {
      const tools = (options.tools ?? []).map(tool => ({
        name: tool.name,
        description: tool.description,
      }))
      const step = respond({ index: calls.length, tools })
      calls.push({ tools })
      const chunks: LanguageModelV3StreamPart[] = [
        { type: 'stream-start', warnings: [] },
      ]
      if (step.toolName) {
        chunks.push({
          type: 'tool-call',
          toolCallId: `call-${calls.length}`,
          toolName: step.toolName,
          input: JSON.stringify(step.input ?? {}),
        })
        chunks.push({
          type: 'finish',
          usage,
          finishReason: { unified: 'tool-calls', raw: undefined },
        })
      }
      else {
        const text = step.text ?? ''
        if (text !== '') {
          chunks.push({ type: 'text-start', id: 'text' })
          chunks.push({ type: 'text-delta', id: 'text', delta: text })
          chunks.push({ type: 'text-end', id: 'text' })
        }
        chunks.push({
          type: 'finish',
          usage,
          finishReason: { unified: 'stop', raw: undefined },
        })
      }
      return {
        stream: simulateReadableStream({
          chunks,
          initialDelayInMs: 0,
          chunkDelayInMs: 0,
        }),
      }
    },
  })
  return { model, calls }
}

function timedSection(start: number, variables: Array<{ unit: number, values: number[] }>, interval = 3600) {
  return {
    time: () => BigInt(start),
    interval: () => interval,
    variablesLength: () => variables.length,
    variables: (index: number) => {
      const variable = variables[index]
      if (!variable)
        return null
      return {
        unit: () => variable.unit,
        value: () => variable.values[0] ?? Number.NaN,
        valuesLength: () => variable.values.length,
        values: (valueIndex: number) => variable.values[valueIndex] ?? null,
      }
    },
  }
}

function location(input: {
  offset?: number
  timezone?: string
  hourly?: { start: number, variables: Array<{ unit: number, values: number[] }>, interval?: number }
  daily?: { start: number, variables: Array<{ unit: number, values: number[] }>, interval?: number }
  current?: { time: number, variables: Array<{ unit: number, value: number }> }
}): DecodedLocation {
  return {
    utcOffsetSeconds: () => input.offset ?? 0,
    timezone: () => input.timezone ?? 'GMT',
    current: () => input.current
      ? timedSection(input.current.time, input.current.variables.map(variable => ({
          unit: variable.unit,
          values: [variable.value],
        })), 0)
      : null,
    hourly: () => input.hourly
      ? timedSection(input.hourly.start, input.hourly.variables, input.hourly.interval)
      : null,
    daily: () => input.daily
      ? timedSection(input.daily.start, input.daily.variables, input.daily.interval ?? 86400)
      : null,
  }
}

function fakeClient(input: {
  places?: Record<string, unknown[]>
  weather?: (url: string, params: Record<string, string>) => DecodedLocation[]
}) {
  const fetches: Array<{ url: string, params: Record<string, string> }> = []
  const client: OpenMeteoClient = {
    async search(name) {
      return { results: input.places?.[name] ?? [] }
    },
    async fetchWeather(url, params) {
      fetches.push({ url, params })
      return input.weather?.(url, params) ?? []
    },
  }
  return { client, fetches }
}

function person(id: string, text: string): UIMessage {
  return { id, role: 'user', parts: [{ type: 'text', text }] }
}

async function ask(input: {
  messages: UIMessage[]
  model: ReturnType<typeof scriptedModel>['model']
  openMeteo: OpenMeteoClient
}) {
  const result = await streamConversation({
    messages: input.messages,
    model: input.model,
    openMeteo: input.openMeteo,
  })
  const activity: string[] = []
  const seenCalls = new Set<string>()
  let assistant: UIMessage | undefined
  for await (const message of readUIMessageStream({
    stream: result.toUIMessageStream({ sendReasoning: true }),
  })) {
    assistant = message
    const live = conversationRows([...input.messages, message], { complete: false })
    const last = live.at(-1)
    const activities = live.filter(row => row.kind === 'activity')
    if (last?.kind === 'reply') {
      assert.equal(activities.length, 0)
    }
    else {
      assert.equal(last?.kind, 'activity')
      assert.equal(activities.length, 1)
      assert.equal(last?.kind === 'activity' ? last.tool : '', 'Thinking')
    }
    for (const part of message.parts) {
      if (!isToolUIPart(part) || seenCalls.has(part.toolCallId))
        continue
      seenCalls.add(part.toolCallId)
      activity.push(toolActivityLabel(getToolName(part)))
    }
  }
  if (!assistant)
    throw new Error('The turn produced no assistant message')
  const messages = [...input.messages, assistant]
  return {
    messages,
    activity,
    rows: conversationRows(messages, { complete: true }),
  }
}

function replyOf(rows: ReturnType<typeof conversationRows>) {
  return rows.find(row => row.kind === 'reply')
}

const start = 1793174400

test('a clear place becomes a line chart', async () => {
  const openMeteo = fakeClient({
    places: { Paris: [paris] },
    weather: () => [location({
      offset: 3600,
      timezone: 'Europe/Paris',
      hourly: {
        start,
        variables: [{ unit: Unit.celsius, values: [11, 12] }],
      },
    })],
  })
  const { model, calls } = scriptedModel(({ index, tools }) => {
    if (index === 0)
      return { toolName: 'geocode', input: { names: ['Paris'] } }
    if (index === 1) {
      return {
        toolName: 'forecast',
        input: {
          latitude: [48.86],
          longitude: [2.35],
          hourly: ['temperature_2m'],
        },
      }
    }
    if (index === 2) {
      assert.equal(tools.some(tool => tool.name === 'chart'), true)
      const chart = tools.find(tool => tool.name === 'chart')
      assert.match(chart?.description ?? '', /Line: change over time/)
      assert.match(chart?.description ?? '', /Temperature is red/)
      assert.match(chart?.description ?? '', /Precipitation is blue/)
      return {
        toolName: 'chart',
        input: {
          type: 'line',
          question: 'How does the temperature change tomorrow in Paris?',
          series: [{
            section: 'hourly',
            variable: 'temperature_2m',
            latitude: 48.86,
            longitude: 2.35,
            color: '#c0392b',
          }],
        },
      }
    }
    return { text: 'Tomorrow warms from 11°C to 12°C.' }
  })

  const { rows, activity } = await ask({
    messages: [person('person-1', 'Tomorrow\'s temperature in Paris')],
    model,
    openMeteo: clientOf(openMeteo),
  })

  assert.equal(calls[0]?.tools.some(tool => tool.name === 'chart'), false)
  assert.equal(calls[1]?.tools.some(tool => tool.name === 'chart'), false)
  assert.deepEqual(activity, ['Geocode tool', 'Weather tool', 'Chart tool'])
  const reply = replyOf(rows)
  assert.equal(reply?.kind, 'reply')
  if (reply?.kind !== 'reply')
    return
  assert.equal(reply.text, 'Tomorrow warms from 11°C to 12°C.')
  assert.equal(reply.chart?.type, 'line')
  assert.equal(reply.chart?.question, 'How does the temperature change tomorrow in Paris?')
  if (reply.chart?.type !== 'line')
    return
  const column = Object.keys(reply.chart.categories)[0]
  assert.ok(column)
  assert.equal(reply.chart.categories[column]?.name, 'Paris, Temperature (2 m)')
  assert.equal(reply.chart.categories[column]?.color, '#c0392b')
  assert.equal(reply.chart.yLabel, '°C')
  assert.deepEqual(reply.chart.data.map(row => row.time), [
    '09:00',
    '10:00',
  ])
  assert.deepEqual(reply.chart.data.map(row => row[column]), [11, 12])
  assert.equal(openMeteo.fetches.length, 1)
  assert.equal(openMeteo.fetches[0]?.url, 'https://api.open-meteo.com/v1/forecast')
})

function clientOf(openMeteo: ReturnType<typeof fakeClient>) {
  return openMeteo.client
}

test('several places are geocoded once and charted on two axes', async () => {
  const openMeteo = fakeClient({
    places: { Paris: [paris], Lyon: [lyon] },
    weather: () => [
      location({
        offset: 3600,
        hourly: {
          start,
          variables: [
            { unit: Unit.celsius, values: [11, 12] },
            { unit: Unit.percentage, values: [80, 78] },
          ],
        },
      }),
      location({
        offset: 3600,
        hourly: {
          start,
          variables: [
            { unit: Unit.celsius, values: [9, 10] },
            { unit: Unit.percentage, values: [70, 65] },
          ],
        },
      }),
    ],
  })
  const { model } = scriptedModel(({ index }) => {
    if (index === 0)
      return { toolName: 'geocode', input: { names: ['Paris', 'Lyon'] } }
    if (index === 1) {
      return {
        toolName: 'forecast',
        input: {
          latitude: [48.86, 45.75],
          longitude: [2.35, 4.85],
          hourly: ['temperature_2m', 'relative_humidity_2m'],
        },
      }
    }
    if (index === 2) {
      return {
        toolName: 'chart',
        input: {
          type: 'line',
          question: 'How do Paris temperature and Lyon humidity compare?',
          series: [
            { section: 'hourly', variable: 'temperature_2m', latitude: 48.86, longitude: 2.35, color: '#c0392b' },
            { section: 'hourly', variable: 'relative_humidity_2m', latitude: 45.75, longitude: 4.85, color: '#2471a3' },
          ],
        },
      }
    }
    return { text: 'Paris warms while Lyon dries a little.' }
  })

  const turn = await ask({
    messages: [person('person-1', 'Compare Paris temperature and Lyon humidity tomorrow')],
    model,
    openMeteo: clientOf(openMeteo),
  })
  const geocode = turn.messages.at(-1)?.parts.find(part => part.type === 'tool-geocode')
  assert.equal(geocode?.type, 'tool-geocode')
  if (geocode?.type !== 'tool-geocode' || geocode.state !== 'output-available')
    return
  assert.deepEqual(geocode.input, { names: ['Paris', 'Lyon'] })
  const reply = replyOf(turn.rows)
  if (reply?.kind !== 'reply' || reply.chart?.type !== 'line')
    assert.fail('expected a line chart')
  assert.equal(reply.chart.yLabel, '°C')
  assert.deepEqual(reply.chart.yAxes, {
    '%': { orientation: 'right', label: '%', domain: [64, 72] },
  })
  const names = Object.values(reply.chart.categories).map(category => category.name)
  assert.deepEqual(names, [
    'Paris, Temperature (2 m)',
    'Lyon, Relative Humidity (2 m)',
  ])
  assert.equal(openMeteo.fetches.length, 1)
  assert.equal(openMeteo.fetches[0]?.params.latitude, '48.86,45.75')
})

test('an unknown code never reaches Open-Meteo and stays off the reply', async () => {
  const openMeteo = fakeClient({ places: { Paris: [paris] } })
  const sentence = 'Could not fetch the forecast: not_a_variable is not a code this tool accepts.'
  const { model } = scriptedModel(({ index }) => {
    if (index === 0)
      return { toolName: 'geocode', input: { names: ['Paris'] } }
    if (index === 1) {
      return {
        toolName: 'forecast',
        input: { latitude: [48.86], longitude: [2.35], hourly: ['not_a_variable'] },
      }
    }
    return { text: 'Try tomorrow\'s temperature in Paris.' }
  })
  const turn = await ask({
    messages: [person('person-1', 'Show me not_a_variable in Paris')],
    model,
    openMeteo: clientOf(openMeteo),
  })
  const forecast = turn.messages.at(-1)?.parts.find(part => part.type === 'tool-forecast')
  assert.equal(forecast?.type, 'tool-forecast')
  if (forecast?.type !== 'tool-forecast' || forecast.state !== 'output-available')
    return
  assert.equal(forecast.output, sentence)
  assert.equal(openMeteo.fetches.length, 0)
  const reply = replyOf(turn.rows)
  assert.equal(reply?.kind, 'reply')
  if (reply?.kind !== 'reply')
    return
  assert.equal(reply.chart, null)
  assert.equal(reply.text.includes('not a code this tool accepts'), false)
  assert.equal(reply.text, 'Try tomorrow\'s temperature in Paris.')
})

test('a chart type outside Nuxt Charts is rejected and kept off the reply', async () => {
  const openMeteo = fakeClient({
    places: { Paris: [paris] },
    weather: () => [location({
      offset: 3600,
      hourly: { start, variables: [{ unit: Unit.celsius, values: [11, 12] }] },
    })],
  })
  const { model } = scriptedModel(({ index }) => {
    if (index === 0)
      return { toolName: 'geocode', input: { names: ['Paris'] } }
    if (index === 1) {
      return {
        toolName: 'forecast',
        input: { latitude: [48.86], longitude: [2.35], hourly: ['temperature_2m'] },
      }
    }
    if (index === 2) {
      return {
        toolName: 'chart',
        input: {
          type: 'scatter',
          question: 'A scatter of Paris',
          series: [{ section: 'hourly', variable: 'temperature_2m', latitude: 48.86, longitude: 2.35, color: '#c0392b' }],
        },
      }
    }
    return { text: 'Ask for tomorrow\'s temperature in Paris.' }
  })
  const turn = await ask({
    messages: [person('person-1', 'Scatter the temperature in Paris')],
    model,
    openMeteo: clientOf(openMeteo),
  })
  const chart = turn.messages.at(-1)?.parts.find(part => part.type === 'tool-chart')
  if (chart?.type !== 'tool-chart' || chart.state !== 'output-available')
    assert.fail('expected a chart result')
  assert.equal(chart.output, 'Could not draw the chart: scatter is not a chart type this tool accepts.')
  const reply = replyOf(turn.rows)
  if (reply?.kind !== 'reply')
    assert.fail('expected a reply')
  assert.equal(reply.chart, null)
  assert.equal(reply.text.includes('not a chart type'), false)
})

test('a series missing from the Weather response is rejected', async () => {
  const openMeteo = fakeClient({
    places: { Paris: [paris] },
    weather: () => [location({
      hourly: { start, variables: [{ unit: Unit.celsius, values: [11] }] },
    })],
  })
  const { model } = scriptedModel(({ index }) => {
    if (index === 0)
      return { toolName: 'geocode', input: { names: ['Paris'] } }
    if (index === 1) {
      return {
        toolName: 'forecast',
        input: { latitude: [48.86], longitude: [2.35], hourly: ['temperature_2m'] },
      }
    }
    if (index === 2) {
      return {
        toolName: 'chart',
        input: {
          type: 'line',
          question: 'Humidity in Paris?',
          series: [{ section: 'hourly', variable: 'relative_humidity_2m', latitude: 48.86, longitude: 2.35, color: '#2471a3' }],
        },
      }
    }
    return { text: 'Ask for tomorrow\'s temperature in Paris.' }
  })
  const turn = await ask({
    messages: [person('person-1', 'Chart humidity in Paris')],
    model,
    openMeteo: clientOf(openMeteo),
  })
  const chart = turn.messages.at(-1)?.parts.find(part => part.type === 'tool-chart')
  if (chart?.type !== 'tool-chart' || chart.state !== 'output-available')
    assert.fail('expected a chart result')
  assert.equal(chart.output, 'Could not draw the chart: hourly relative_humidity_2m at 48.86, 2.35 is not in the Weather response.')
  const reply = replyOf(turn.rows)
  if (reply?.kind !== 'reply')
    assert.fail('expected a reply')
  assert.equal(reply.chart, null)
  assert.equal(reply.text.includes('not in the Weather response'), false)
})

test('an out-of-scope question is refused in plain language', async () => {
  const openMeteo = fakeClient({})
  const { model } = scriptedModel(() => ({
    text: 'I can\'t answer that. I can look up weather for a place and chart it.',
  }))
  const turn = await ask({
    messages: [person('person-1', 'Write a poem about the moon')],
    model,
    openMeteo: clientOf(openMeteo),
  })
  const reply = replyOf(turn.rows)
  if (reply?.kind !== 'reply')
    assert.fail('expected a reply')
  assert.equal(reply.chart, null)
  assert.equal(reply.text, 'I can\'t answer that. I can look up weather for a place and chart it.')
  assert.equal(openMeteo.fetches.length, 0)
})

test('a turn with no reply shows the fallback sentence', async () => {
  const openMeteo = fakeClient({})
  const { model, calls } = scriptedModel(() => ({ toolName: 'geocode', input: { names: ['Paris'] } }))
  const turn = await ask({
    messages: [person('person-1', 'Weather')],
    model,
    openMeteo: clientOf(openMeteo),
  })
  assert.equal(calls.length, 8)
  const reply = replyOf(turn.rows)
  if (reply?.kind !== 'reply')
    assert.fail('expected a reply')
  assert.equal(reply.chart, null)
  assert.equal(reply.text, 'I couldn\'t answer that. Ask for weather in a place, such as tomorrow\'s temperature in Paris.')
})

test('a clarification ends the turn and the next message gets 8 new steps', async () => {
  const openMeteo = fakeClient({ places: { Paris: [paris] } })
  const firstModel = scriptedModel(() => ({ text: 'Which Paris did you mean?' }))
  const first = await ask({
    messages: [person('person-1', 'Temperature in Paris')],
    model: firstModel.model,
    openMeteo: clientOf(openMeteo),
  })
  assert.equal(firstModel.calls.length, 1)
  const firstReply = replyOf(first.rows)
  if (firstReply?.kind !== 'reply')
    assert.fail('expected a clarification')
  assert.equal(firstReply.text, 'Which Paris did you mean?')
  assert.equal(firstReply.chart, null)

  const secondModel = scriptedModel(() => ({ toolName: 'geocode', input: { names: ['Paris, France'] } }))
  await ask({
    messages: [
      ...first.messages,
      person('person-2', 'Paris, France'),
    ],
    model: secondModel.model,
    openMeteo: clientOf(openMeteo),
  })
  assert.equal(secondModel.calls.length, 8)
})

test('a current value is one labeled row', async () => {
  const openMeteo = fakeClient({
    places: { Paris: [paris] },
    weather: () => [location({
      offset: 3600,
      current: { time: start, variables: [{ unit: Unit.celsius, value: 14 }] },
    })],
  })
  const { model } = scriptedModel(({ index }) => {
    if (index === 0)
      return { toolName: 'geocode', input: { names: ['Paris'] } }
    if (index === 1) {
      return {
        toolName: 'forecast',
        input: { latitude: [48.86], longitude: [2.35], current: ['temperature_2m'] },
      }
    }
    if (index === 2) {
      return {
        toolName: 'chart',
        input: {
          type: 'bar',
          question: 'What is the temperature in Paris right now?',
          series: [{ section: 'current', variable: 'temperature_2m', latitude: 48.86, longitude: 2.35, color: '#c0392b' }],
        },
      }
    }
    return { text: 'It is 14°C.' }
  })
  const turn = await ask({
    messages: [person('person-1', 'What is the temperature in Paris right now?')],
    model,
    openMeteo: clientOf(openMeteo),
  })
  const reply = replyOf(turn.rows)
  if (reply?.kind !== 'reply' || reply.chart?.type !== 'bar')
    assert.fail('expected a bar chart')
  assert.equal(reply.chart.xAxis, 'label')
  assert.equal(reply.chart.data.length, 1)
  assert.equal(reply.chart.data[0]?.label, 'Paris, Temperature (2 m)')
  const column = Object.keys(reply.chart.categories)[0]
  assert.equal(reply.chart.data[0]?.[column ?? ''], 14)
})

test('mixed time zones share a UTC axis', async () => {
  const openMeteo = fakeClient({
    places: { Paris: [paris], Lyon: [lyon] },
    weather: () => [
      location({
        offset: 3600,
        hourly: { start, variables: [{ unit: Unit.celsius, values: [11, 12] }] },
      }),
      location({
        offset: -14400,
        hourly: { start, variables: [{ unit: Unit.celsius, values: [8, 9] }] },
      }),
    ],
  })
  const { model } = scriptedModel(({ index }) => {
    if (index === 0)
      return { toolName: 'geocode', input: { names: ['Paris', 'Lyon'] } }
    if (index === 1) {
      return {
        toolName: 'forecast',
        input: {
          latitude: [48.86, 45.75],
          longitude: [2.35, 4.85],
          hourly: ['temperature_2m'],
        },
      }
    }
    if (index === 2) {
      return {
        toolName: 'chart',
        input: {
          type: 'line',
          question: 'Paris and a place four hours west',
          series: [
            { section: 'hourly', variable: 'temperature_2m', latitude: 48.86, longitude: 2.35, color: '#c0392b' },
            { section: 'hourly', variable: 'temperature_2m', latitude: 45.75, longitude: 4.85, color: '#e67e22' },
          ],
        },
      }
    }
    return { text: 'The hours are in UTC.' }
  })
  const turn = await ask({
    messages: [person('person-1', 'Compare those temperatures')],
    model,
    openMeteo: clientOf(openMeteo),
  })
  const reply = replyOf(turn.rows)
  if (reply?.kind !== 'reply' || reply.chart?.type !== 'line')
    assert.fail('expected a line chart')
  assert.deepEqual(reply.chart.data.map(row => row.time), [
    '08:00 UTC',
    '09:00 UTC',
  ])
})

test('a donut uses the latest value of each series', async () => {
  const openMeteo = fakeClient({
    places: { Paris: [paris] },
    weather: () => [location({
      offset: 3600,
      hourly: {
        start,
        variables: [
          { unit: Unit.celsius, values: [11, 15] },
          { unit: Unit.percentage, values: [40, 55] },
        ],
      },
    })],
  })
  const { model } = scriptedModel(({ index }) => {
    if (index === 0)
      return { toolName: 'geocode', input: { names: ['Paris'] } }
    if (index === 1) {
      return {
        toolName: 'forecast',
        input: {
          latitude: [48.86],
          longitude: [2.35],
          hourly: ['temperature_2m', 'relative_humidity_2m'],
        },
      }
    }
    if (index === 2) {
      return {
        toolName: 'chart',
        input: {
          type: 'donut',
          question: 'What is the latest split in Paris?',
          series: [
            { section: 'hourly', variable: 'temperature_2m', latitude: 48.86, longitude: 2.35, color: '#c0392b' },
            { section: 'hourly', variable: 'relative_humidity_2m', latitude: 48.86, longitude: 2.35, color: '#2471a3' },
          ],
        },
      }
    }
    return { text: 'Here is the latest split.' }
  })
  const turn = await ask({
    messages: [person('person-1', 'Donut of the latest Paris values')],
    model,
    openMeteo: clientOf(openMeteo),
  })
  const reply = replyOf(turn.rows)
  if (reply?.kind !== 'reply' || reply.chart?.type !== 'donut')
    assert.fail('expected a donut')
  assert.equal(reply.chart.question, 'What is the latest split in Paris?')
  assert.deepEqual(reply.chart.data, [
    { name: 'Paris, Temperature (2 m)', value: 15 },
    { name: 'Paris, Relative Humidity (2 m)', value: 55 },
  ])
})

test('an archive call can be charted, and a missing date never reaches Open-Meteo', async () => {
  const openMeteo = fakeClient({
    places: { Paris: [paris] },
    weather: () => [location({
      offset: 3600,
      daily: {
        start,
        interval: 86400,
        variables: [{ unit: Unit.celsius, values: [9, 11] }],
      },
    })],
  })
  const success = scriptedModel(({ index }) => {
    if (index === 0)
      return { toolName: 'geocode', input: { names: ['Paris'] } }
    if (index === 1) {
      return {
        toolName: 'archive',
        input: {
          latitude: [48.86],
          longitude: [2.35],
          start_date: '2024-01-01',
          end_date: '2024-01-02',
          daily: ['temperature_2m_mean'],
          timezone: 'Europe/Paris',
        },
      }
    }
    if (index === 2) {
      return {
        toolName: 'chart',
        input: {
          type: 'bar',
          question: 'How did the daily mean look?',
          series: [{ section: 'daily', variable: 'temperature_2m_mean', latitude: 48.86, longitude: 2.35, color: '#c0392b' }],
        },
      }
    }
    return { text: 'Two mild days.' }
  })
  const charted = await ask({
    messages: [person('person-1', 'Daily mean temperature in Paris last January')],
    model: success.model,
    openMeteo: clientOf(openMeteo),
  })
  const chartedReply = replyOf(charted.rows)
  if (chartedReply?.kind !== 'reply' || chartedReply.chart?.type !== 'bar')
    assert.fail('expected a bar chart')
  assert.equal(charted.activity.includes('Weather tool'), true)
  assert.equal(openMeteo.fetches.length, 1)
  assert.equal(openMeteo.fetches[0]?.url, 'https://archive-api.open-meteo.com/v1/archive')

  const rejected = fakeClient({ places: { Paris: [paris] } })
  const rejection = scriptedModel(({ index }) => {
    if (index === 0)
      return { toolName: 'geocode', input: { names: ['Paris'] } }
    if (index === 1) {
      return {
        toolName: 'archive',
        input: { latitude: [48.86], longitude: [2.35], daily: ['temperature_2m_mean'], timezone: 'Europe/Paris' },
      }
    }
    return { text: 'Give me a start and end date.' }
  })
  const failed = await ask({
    messages: [person('person-2', 'Archive temperature in Paris')],
    model: rejection.model,
    openMeteo: clientOf(rejected),
  })
  const archive = failed.messages.at(-1)?.parts.find(part => part.type === 'tool-archive')
  if (archive?.type !== 'tool-archive' || archive.state !== 'output-available')
    assert.fail('expected an archive result')
  assert.equal(archive.output, 'Could not fetch the archive: start_date and end_date are required.')
  assert.equal(rejected.fetches.length, 0)
  const failedReply = replyOf(failed.rows)
  if (failedReply?.kind !== 'reply')
    assert.fail('expected a reply')
  assert.equal(failedReply.chart, null)
  assert.equal(String(failedReply.text).includes('start_date'), false)
})

test('ensemble, marine, air quality, and flood each chart once and reject a bad call', async () => {
  await assertSource({
    tool: 'ensemble',
    url: 'https://ensemble-api.open-meteo.com/v1/ensemble',
    input: { latitude: [48.86], longitude: [2.35], models: ['dwd_icon_seamless_eps'], hourly: ['temperature_2m'] },
    section: 'hourly',
    variable: 'temperature_2m',
    badInput: { latitude: [48.86], longitude: [2.35], hourly: ['temperature_2m'] },
    badSentence: 'Could not fetch the ensemble: models is required.',
  })
  await assertSource({
    tool: 'marine',
    url: 'https://marine-api.open-meteo.com/v1/marine',
    input: { latitude: [48.86], longitude: [2.35], hourly: ['wave_height'] },
    section: 'hourly',
    variable: 'wave_height',
    badInput: { latitude: [48.86], longitude: [2.35], hourly: ['not_a_wave'] },
    badSentence: 'Could not fetch the marine: not_a_wave is not a code this tool accepts.',
  })
  await assertSource({
    tool: 'airQuality',
    url: 'https://air-quality-api.open-meteo.com/v1/air-quality',
    input: { latitude: [48.86], longitude: [2.35], hourly: ['pm10'] },
    section: 'hourly',
    variable: 'pm10',
    badInput: { latitude: [48.86], longitude: [2.35] },
    badSentence: 'Could not fetch the air quality: hourly or current is required.',
  })
  await assertSource({
    tool: 'flood',
    url: 'https://flood-api.open-meteo.com/v1/flood',
    input: { latitude: [48.86], longitude: [2.35], daily: ['river_discharge'] },
    section: 'daily',
    variable: 'river_discharge',
    badInput: { latitude: [48.86], longitude: [2.35], daily: ['river_discharge'], format: 'json' },
    badSentence: 'Could not fetch the flood: format is not an argument this tool accepts.',
  })
})

test('historical forecast, previous runs, and single runs each chart once and reject a bad call', async () => {
  await assertSource({
    tool: 'historicalForecast',
    url: 'https://historical-forecast-api.open-meteo.com/v1/forecast',
    input: { latitude: [48.86], longitude: [2.35], hourly: ['temperature_2m'] },
    section: 'hourly',
    variable: 'temperature_2m',
    badInput: { latitude: [48.86], longitude: [2.35], daily: ['temperature_2m_max'] },
    badSentence: 'Could not fetch the historical forecast: daily requires timezone.',
  })
  await assertSource({
    tool: 'previousRuns',
    url: 'https://previous-runs-api.open-meteo.com/v1/forecast',
    input: { latitude: [48.86], longitude: [2.35], hourly: ['temperature_2m_previous_day1'] },
    section: 'hourly',
    variable: 'temperature_2m_previous_day1',
    badInput: { latitude: [48.86], longitude: [2.35], hourly: ['temperature_2m_previous_day9'] },
    badSentence: 'Could not fetch the previous runs: temperature_2m_previous_day9 is not a code this tool accepts.',
  })
  await assertSource({
    tool: 'singleRuns',
    url: 'https://single-runs-api.open-meteo.com/v1/forecast',
    input: { latitude: [48.86], longitude: [2.35], run: '2026-10-26T00:00', hourly: ['temperature_2m'] },
    section: 'hourly',
    variable: 'temperature_2m',
    badInput: { latitude: [48.86], longitude: [2.35], hourly: ['temperature_2m'] },
    badSentence: 'Could not fetch the single runs: run is required.',
  })
})

test('climate, seasonal, and satellite radiation each chart once and reject a bad call', async () => {
  await assertSource({
    tool: 'climate',
    url: 'https://climate-api.open-meteo.com/v1/climate',
    input: {
      latitude: [48.86],
      longitude: [2.35],
      models: ['MRI_AGCM3_2_S'],
      daily: ['temperature_2m_mean'],
      start_date: '2020-01-01',
      end_date: '2020-01-02',
    },
    section: 'daily',
    variable: 'temperature_2m_mean',
    badInput: { latitude: [48.86], longitude: [2.35], daily: ['temperature_2m_mean'], start_date: '2020-01-01', end_date: '2020-01-02' },
    badSentence: 'Could not fetch the climate: models is required.',
  })
  await assertSource({
    tool: 'seasonal',
    url: 'https://seasonal-api.open-meteo.com/v1/seasonal',
    input: { latitude: [48.86], longitude: [2.35], daily: ['temperature_2m_max'] },
    section: 'daily',
    variable: 'temperature_2m_max',
    badInput: { latitude: [48.86], longitude: [2.35], hourly: ['temperature_2m'] },
    badSentence: 'Could not fetch the seasonal: daily is required.',
  })
  await assertSource({
    tool: 'satelliteRadiation',
    url: 'https://satellite-api.open-meteo.com/v1/archive',
    input: {
      latitude: [48.86],
      longitude: [2.35],
      hourly: ['shortwave_radiation'],
      models: ['satellite_radiation_seamless'],
      temporal_resolution: 'native',
    },
    section: 'hourly',
    variable: 'shortwave_radiation',
    badInput: { latitude: [48.86], longitude: [2.35], hourly: ['shortwave_radiation'], models: ['satellite_radiation_seamless'] },
    badSentence: 'Could not fetch the satellite radiation: temporal_resolution is required.',
  })
})

test('candlestick folds hours into a day, and a second chart is a second call', async () => {
  const openMeteo = fakeClient({
    places: { Paris: [paris] },
    weather: () => [location({
      offset: 3600,
      hourly: {
        start,
        variables: [{ unit: Unit.celsius, values: [10, 12, 8, 11] }],
      },
    })],
  })
  const { model } = scriptedModel(({ index }) => {
    if (index === 0)
      return { toolName: 'geocode', input: { names: ['Paris'] } }
    if (index === 1) {
      return {
        toolName: 'forecast',
        input: { latitude: [48.86], longitude: [2.35], hourly: ['temperature_2m'] },
      }
    }
    if (index === 2) {
      return {
        toolName: 'chart',
        input: {
          type: 'candlestick',
          question: 'What did the day do?',
          series: [{ section: 'hourly', variable: 'temperature_2m', latitude: 48.86, longitude: 2.35, color: '#c0392b' }],
        },
      }
    }
    if (index === 3) {
      return {
        toolName: 'chart',
        input: {
          type: 'line',
          question: 'The same hours as a line',
          series: [{ section: 'hourly', variable: 'temperature_2m', latitude: 48.86, longitude: 2.35, color: '#c0392b' }],
        },
      }
    }
    return { text: 'Two views of the same day.' }
  })
  const turn = await ask({
    messages: [person('person-1', 'Show the day as candles and as a line')],
    model,
    openMeteo: clientOf(openMeteo),
  })
  const charts = turn.messages.at(-1)?.parts.filter(part => part.type === 'tool-chart') ?? []
  assert.equal(charts.length, 2)
  const replies = turn.rows.filter(row => row.kind === 'reply')
  assert.equal(replies.length, 2)
  const candles = replies[0]
  if (candles?.kind !== 'reply' || candles.chart?.type !== 'candlestick')
    assert.fail('expected candles')
  assert.deepEqual(candles.chart.sets[0]?.data, [{
    label: 'Wed 28',
    open: 10,
    high: 12,
    low: 8,
    close: 11,
  }])
  const line = replies[1]
  if (line?.kind !== 'reply' || line.chart?.type !== 'line')
    assert.fail('expected a second line chart')
  assert.equal(line.chart.question, 'The same hours as a line')
})

async function assertSource(input: {
  tool: string
  url: string
  input: Record<string, unknown>
  section: 'hourly' | 'daily'
  variable: string
  badInput: Record<string, unknown>
  badSentence: string
}) {
  const openMeteo = fakeClient({
    places: { Paris: [paris] },
    weather: () => [location({
      offset: 3600,
      hourly: input.section === 'hourly'
        ? { start, variables: [{ unit: Unit.celsius, values: [11, 12] }] }
        : undefined,
      daily: input.section === 'daily'
        ? { start, interval: 86400, variables: [{ unit: Unit.celsius, values: [11, 12] }] }
        : undefined,
    })],
  })
  const success = scriptedModel(({ index }) => {
    if (index === 0)
      return { toolName: 'geocode', input: { names: ['Paris'] } }
    if (index === 1)
      return { toolName: input.tool, input: input.input }
    if (index === 2) {
      return {
        toolName: 'chart',
        input: {
          type: 'line',
          question: `How does ${input.variable} change?`,
          series: [{
            section: input.section,
            variable: input.variable,
            latitude: 48.86,
            longitude: 2.35,
            color: '#c0392b',
          }],
        },
      }
    }
    return { text: 'Here is the series.' }
  })
  const charted = await ask({
    messages: [person('person-1', `Chart ${input.tool}`)],
    model: success.model,
    openMeteo: clientOf(openMeteo),
  })
  const reply = replyOf(charted.rows)
  if (reply?.kind !== 'reply' || reply.chart?.type !== 'line')
    assert.fail(`${input.tool} did not chart`)
  assert.equal(charted.activity.map(tool => toolActivityLabel(tool)).includes('Weather tool') || charted.activity.includes('Weather tool'), true)
  assert.equal(openMeteo.fetches[0]?.url, input.url)

  const rejected = fakeClient({ places: { Paris: [paris] } })
  const failure = scriptedModel(({ index }) => {
    if (index === 0)
      return { toolName: 'geocode', input: { names: ['Paris'] } }
    if (index === 1)
      return { toolName: input.tool, input: input.badInput }
    return { text: 'Ask for tomorrow\'s temperature in Paris.' }
  })
  const failed = await ask({
    messages: [person('person-2', `Bad ${input.tool}`)],
    model: failure.model,
    openMeteo: clientOf(rejected),
  })
  const toolPart = failed.messages.at(-1)?.parts.find(part => part.type === `tool-${input.tool}`)
  if (!toolPart || toolPart.type !== `tool-${input.tool}` || !('output' in toolPart))
    assert.fail(`${input.tool} did not return a result`)
  assert.equal(toolPart.output, input.badSentence)
  assert.equal(rejected.fetches.length, 0)
  const failedReply = replyOf(failed.rows)
  if (failedReply?.kind !== 'reply')
    assert.fail('expected a correction')
  assert.equal(failedReply.chart, null)
  assert.equal(failedReply.text.includes(input.badSentence), false)
}
