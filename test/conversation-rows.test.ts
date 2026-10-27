import assert from 'node:assert/strict'
import test from 'node:test'
import type { UIMessage } from 'ai'
import { conversationRows } from '../app/components/chat/conversation-rows.ts'

const lineChart = {
  type: 'line',
  question: 'How does the temperature change over the next day in Paris?',
  data: [
    { hour: '08:00', temperature: 11 },
    { hour: '09:00', temperature: 12 },
  ],
  categories: {
    temperature: { name: 'Temperature', color: '#2662d9' },
  },
  xAxis: 'hour',
  yLabel: '°C',
}

function message(partial: Pick<UIMessage, 'id' | 'role' | 'parts'>): UIMessage {
  return partial
}

test('a person message is their text', () => {
  const rows = conversationRows([
    message({
      id: 'person-1',
      role: 'user',
      parts: [{ type: 'text', text: 'Weather in Paris' }],
    }),
  ])

  assert.deepEqual(rows, [
    { id: 'person-1', kind: 'person', text: 'Weather in Paris' },
  ])
})

test('a running Geocode tool is one Tool activity line', () => {
  const rows = conversationRows([
    message({
      id: 'person-1',
      role: 'user',
      parts: [{ type: 'text', text: 'Weather in Paris' }],
    }),
    message({
      id: 'assistant-1',
      role: 'assistant',
      parts: [
        { type: 'step-start' },
        {
          type: 'tool-geocode',
          toolCallId: 'call-1',
          state: 'input-available',
          input: { places: ['Paris'] },
        },
      ],
    }),
  ])

  assert.deepEqual(rows, [
    { id: 'person-1', kind: 'person', text: 'Weather in Paris' },
    { id: 'assistant-1-activity', kind: 'activity', tool: 'Geocode tool' },
  ])
})

test('a running forecast tool is Tool activity named Weather tool', () => {
  const rows = conversationRows([
    message({
      id: 'assistant-1',
      role: 'assistant',
      parts: [
        {
          type: 'tool-geocode',
          toolCallId: 'call-1',
          state: 'output-available',
          input: { places: ['Paris'] },
          output: [],
        },
        {
          type: 'tool-forecast',
          toolCallId: 'call-2',
          state: 'input-available',
          input: { latitude: [48.86], longitude: [2.35] },
        },
      ],
    }),
  ])

  assert.deepEqual(rows, [
    { id: 'assistant-1-activity', kind: 'activity', tool: 'Weather tool' },
  ])
})

test('reasoning text is not shown', () => {
  const rows = conversationRows([
    message({
      id: 'assistant-1',
      role: 'assistant',
      parts: [
        { type: 'reasoning', text: 'The person wants Paris.' },
        {
          type: 'tool-geocode',
          toolCallId: 'call-1',
          state: 'input-streaming',
          input: {},
        },
      ],
    }),
  ])

  assert.deepEqual(rows, [
    { id: 'assistant-1-activity', kind: 'activity', tool: 'Geocode tool' },
  ])
})

test('a Chart tool result that only names a series does not draw a chart', () => {
  const rows = conversationRows([
    message({
      id: 'assistant-1',
      role: 'assistant',
      parts: [
        { type: 'text', text: 'I couldn\'t draw a chart for that.' },
        {
          type: 'tool-chart',
          toolCallId: 'call-3',
          state: 'output-available',
          input: {},
          output: {
            type: 'line',
            question: 'How does the temperature change over the next day in Paris?',
            series: [
              {
                section: 'hourly',
                variable: 'temperature_2m',
                latitude: 48.86,
                longitude: 2.35,
              },
            ],
          },
        },
      ],
    }),
  ])

  assert.deepEqual(rows, [
    {
      id: 'assistant-1-reply-0',
      kind: 'reply',
      text: 'I couldn\'t draw a chart for that.',
      chart: null,
    },
  ])
})

test('a line chart that already has rows is shown with the reply', () => {
  const rows = conversationRows([
    message({
      id: 'assistant-1',
      role: 'assistant',
      parts: [
        { type: 'text', text: 'Here are the next 24 hours.' },
        {
          type: 'tool-chart',
          toolCallId: 'call-3',
          state: 'output-available',
          input: {},
          output: lineChart,
        },
      ],
    }),
  ])

  assert.deepEqual(rows, [
    {
      id: 'assistant-1-reply-0',
      kind: 'reply',
      text: 'Here are the next 24 hours.',
      chart: {
        data: lineChart.data,
        categories: lineChart.categories,
        xAxis: 'hour',
        yLabel: '°C',
      },
    },
  ])
})

test('a chart question is the reply when the assistant has not written text', () => {
  const rows = conversationRows([
    message({
      id: 'assistant-1',
      role: 'assistant',
      parts: [
        {
          type: 'tool-chart',
          toolCallId: 'call-3',
          state: 'output-available',
          input: {},
          output: lineChart,
        },
      ],
    }),
  ])

  assert.equal(rows[0]?.kind, 'reply')
  if (rows[0]?.kind !== 'reply')
    return
  assert.equal(rows[0].text, lineChart.question)
  assert.deepEqual(rows[0].chart?.data, lineChart.data)
})
