import { getToolName, isToolUIPart, type UIMessage } from 'ai'
import { chartFromToolOutput, type ConversationChart } from '../../chart/from-tool-output.ts'

const runningStates = new Set([
  'input-streaming',
  'input-available',
  'approval-requested',
  'approval-responded',
])

const weatherToolNames = new Set([
  'forecast',
  'archive',
  'historicalforecast',
  'previousruns',
  'singleruns',
  'ensemble',
  'marine',
  'airquality',
  'flood',
  'climate',
  'seasonal',
  'satelliteradiation',
  'weather',
  'weathertool',
])

export const emptyReply = 'I couldn\'t answer that. Ask for weather in a place, such as tomorrow\'s temperature in Paris.'

export type ConversationRow
  = { id: string, kind: 'person', text: string }
    | { id: string, kind: 'activity', tool: string }
    | { id: string, kind: 'reply', text: string, chart: ConversationChart | null }

function canonicalToolName(toolName: string) {
  return toolName.toLowerCase().replace(/[^a-z]/g, '')
}

export function toolActivityLabel(toolName: string) {
  const key = canonicalToolName(toolName)
  if (key === 'geocode' || key === 'geocodetool')
    return 'Geocode tool'
  if (key === 'chart' || key === 'charttool')
    return 'Chart tool'
  if (weatherToolNames.has(key))
    return 'Weather tool'
  return toolName
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isChartTool(toolName: string) {
  const key = canonicalToolName(toolName)
  return key === 'chart' || key === 'charttool'
}

function questionFromOutput(output: unknown) {
  if (!isRecord(output) || typeof output.question !== 'string')
    return ''
  return output.question
}

function textFromParts(message: UIMessage) {
  return message.parts
    .filter(part => part.type === 'text')
    .map(part => part.text)
    .join('')
}

function rowsForAssistant(message: UIMessage): ConversationRow[] {
  let text = ''
  let chart: ConversationChart | null = null
  let question = ''
  let running: string | null = null
  const rows: ConversationRow[] = []

  function flushReply() {
    const body = text.trim() || (chart ? question.trim() : '')
    if (body === '' && chart === null) {
      text = ''
      return
    }
    rows.push({
      id: `${message.id}-reply-${rows.length}`,
      kind: 'reply',
      text: body,
      chart,
    })
    text = ''
    chart = null
    question = ''
  }

  for (const part of message.parts) {
    if (part.type === 'text') {
      text += part.text
      continue
    }
    if (part.type === 'reasoning' || part.type === 'step-start' || !isToolUIPart(part))
      continue
    if (runningStates.has(part.state)) {
      flushReply()
      running = toolActivityLabel(getToolName(part))
      continue
    }
    running = null
    if (part.state === 'output-available' && isChartTool(getToolName(part))) {
      const nextChart = chartFromToolOutput(part.output)
      if (nextChart) {
        if (chart)
          flushReply()
        chart = nextChart
        question = nextChart.question || questionFromOutput(part.output)
      }
    }
  }

  if (running) {
    rows.push({
      id: `${message.id}-activity`,
      kind: 'activity',
      tool: running,
    })
    return rows
  }

  flushReply()
  return rows
}

export function conversationRows(messages: UIMessage[], options?: { complete?: boolean }): ConversationRow[] {
  const rows: ConversationRow[] = []
  for (const message of messages) {
    if (message.role === 'user') {
      const text = textFromParts(message)
      if (text.trim() !== '')
        rows.push({ id: message.id, kind: 'person', text })
      continue
    }
    if (message.role !== 'assistant')
      continue
    const assistantRows = rowsForAssistant(message)
    if (assistantRows.length === 0 && options?.complete) {
      rows.push({ id: `${message.id}-reply-0`, kind: 'reply', text: emptyReply, chart: null })
      continue
    }
    rows.push(...assistantRows)
  }
  return rows
}
