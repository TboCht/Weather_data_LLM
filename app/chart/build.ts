import type { PlaceMatch, WeatherLocation, WeatherResponse, WeatherSection, WeatherVariable } from '../../server/weather/types.ts'
import type { ConversationChart } from './types.ts'

export interface ChartSeriesInput {
  section: 'current' | 'hourly' | 'daily'
  variable: string
  latitude: number
  longitude: number
  color: string
}

interface FoundSeries {
  key: string
  section: ChartSeriesInput['section']
  variable: string
  description: string
  unit: string
  color: string
  latitude: number
  longitude: number
  place: string
  label: string
  offset: number
  time: number[]
  values: Array<number | null>
}

const chartTypes: Record<string, ConversationChart['type']> = {
  'line': 'line',
  'area': 'area',
  'bar': 'bar',
  'donut': 'donut',
  'bubble': 'bubble',
  'radar': 'radar',
  'radial bar': 'radial-bar',
  'radial-bar': 'radial-bar',
  'funnel': 'funnel',
  'sankey': 'sankey',
  'candlestick': 'candlestick',
  'status tracker': 'status-tracker',
  'status-tracker': 'status-tracker',
  'dotted map': 'dotted-map',
  'dotted-map': 'dotted-map',
  'topojson map': 'topojson-map',
  'topojson-map': 'topojson-map',
}

function failure(detail: string) {
  return { ok: false as const, sentence: `Could not draw the chart: ${detail}` }
}

function samePlace(left: number, right: number) {
  return Math.abs(left - right) < 0.01
}

function formatTime(unixSeconds: number, offsetSeconds: number | null) {
  const shifted = offsetSeconds === null ? unixSeconds : unixSeconds + offsetSeconds
  const date = new Date(shifted * 1000)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hour = String(date.getUTCHours()).padStart(2, '0')
  const minute = String(date.getUTCMinutes()).padStart(2, '0')
  const stamp = `${year}-${month}-${day} ${hour}:${minute}`
  return offsetSeconds === null ? `${stamp} UTC` : stamp
}

function latestValue(values: Array<number | null>) {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index]
    if (typeof value === 'number')
      return value
  }
  return null
}

function placeName(places: PlaceMatch[], latitude: number, longitude: number) {
  const match = places.find(place =>
    samePlace(place.latitude, latitude) && samePlace(place.longitude, longitude),
  )
  return match ? match.name : `${latitude}, ${longitude}`
}

function findVariable(section: WeatherSection | undefined, code: string): WeatherVariable | null {
  return section?.variables.find(variable => variable.code === code) ?? null
}

function locate(weather: WeatherResponse, series: ChartSeriesInput): { location: WeatherLocation, variable: WeatherVariable } | null {
  const location = weather.locations.find(item =>
    samePlace(item.latitude, series.latitude) && samePlace(item.longitude, series.longitude),
  )
  if (!location)
    return null
  const variable = findVariable(location[series.section], series.variable)
  if (!variable)
    return null
  return { location, variable }
}

function readSeries(input: {
  weather: WeatherResponse
  places: PlaceMatch[]
  series: ChartSeriesInput[]
}): { ok: true, found: FoundSeries[] } | { ok: false, sentence: string } {
  const found: FoundSeries[] = []
  for (const [index, series] of input.series.entries()) {
    if (series.section !== 'current' && series.section !== 'hourly' && series.section !== 'daily')
      return failure(`${String(series.section)} is not a section a chart can use.`)
    if (typeof series.variable !== 'string' || series.variable === '')
      return failure('a series needs a variable code.')
    if (typeof series.latitude !== 'number' || typeof series.longitude !== 'number')
      return failure('a series needs latitude and longitude.')
    if (typeof series.color !== 'string' || series.color === '')
      return failure('a series needs a color.')
    const located = locate(input.weather, series)
    if (!located) {
      return failure(`${series.section} ${series.variable} at ${series.latitude}, ${series.longitude} is not in the Weather response.`)
    }
    const latest = latestValue(located.variable.values)
    if (latest === null) {
      return failure(`${series.section} ${series.variable} at ${series.latitude}, ${series.longitude} has no values in the Weather response.`)
    }
    const place = placeName(input.places, series.latitude, series.longitude)
    found.push({
      key: `series${index}`,
      section: series.section,
      variable: series.variable,
      description: located.variable.description,
      unit: located.variable.unit || 'value',
      color: series.color,
      latitude: series.latitude,
      longitude: series.longitude,
      place,
      label: `${place}, ${located.variable.description}`,
      offset: located.location.utcOffsetSeconds,
      time: located.location[series.section]?.time ?? [],
      values: located.variable.values,
    })
  }
  return { ok: true, found }
}

function sharedOffset(series: FoundSeries[]) {
  const first = series[0]?.offset
  if (first === undefined)
    return null
  return series.every(item => item.offset === first) ? first : null
}

function axisChart(type: 'line' | 'area' | 'bar', question: string, series: FoundSeries[]): ConversationChart {
  const units: string[] = []
  for (const item of series) {
    if (!units.includes(item.unit))
      units.push(item.unit)
  }
  const primary = units[0] ?? 'value'
  const yAxes: Record<string, { orientation: 'left' | 'right', label: string }> = {}
  for (const [index, unit] of units.entries()) {
    if (index === 0)
      continue
    yAxes[unit] = { orientation: index % 2 === 1 ? 'right' : 'left', label: unit }
  }
  const categories = Object.fromEntries(series.map(item => [item.key, {
    name: item.label,
    color: item.color,
    ...item.unit === primary ? {} : { yAxis: item.unit },
  }]))

  if (series.every(item => item.section === 'current')) {
    return {
      type,
      question,
      xAxis: 'label',
      yLabel: primary,
      ...Object.keys(yAxes).length > 0 ? { yAxes } : {},
      categories,
      data: series.map(item => ({
        label: item.label,
        [item.key]: latestValue(item.values) ?? 0,
      })),
    }
  }

  const offset = sharedOffset(series)
  const rows = new Map<number, Record<string, string | number>>()
  for (const item of series) {
    for (const [index, unix] of item.time.entries()) {
      const value = item.values[index]
      if (typeof value !== 'number' || typeof unix !== 'number')
        continue
      const row = rows.get(unix) ?? { time: formatTime(unix, offset) }
      row[item.key] = value
      rows.set(unix, row)
    }
  }
  return {
    type,
    question,
    xAxis: 'time',
    yLabel: primary,
    ...Object.keys(yAxes).length > 0 ? { yAxes } : {},
    categories,
    data: [...rows.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([, row]) => row),
  }
}

function partChart(type: 'donut' | 'radial-bar' | 'funnel', question: string, series: FoundSeries[]): ConversationChart {
  return {
    type,
    question,
    nameKey: 'name',
    valueKey: 'value',
    data: series.map(item => ({ name: item.label, value: latestValue(item.values) ?? 0 })),
    categories: Object.fromEntries(series.map(item => [item.label, { name: item.label, color: item.color }])),
  }
}

function radarChart(question: string, series: FoundSeries[]): ConversationChart {
  const groups = new Map<string, FoundSeries[]>()
  for (const item of series) {
    const key = `${item.latitude.toFixed(2)},${item.longitude.toFixed(2)}`
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  if (groups.size < 2) {
    return {
      type: 'radar',
      question,
      dataKey: 'spoke',
      categories: { value: { name: series[0]?.place ?? 'Value', color: series[0]?.color } },
      data: series.map(item => ({ spoke: item.label, value: latestValue(item.values) ?? 0 })),
    }
  }
  const spokes = new Map<string, { description: string, values: Record<string, number> }>()
  const categories: Record<string, { name: string, color?: string }> = {}
  for (const [key, items] of groups) {
    const first = items[0]
    if (!first)
      continue
    categories[key] = { name: first.place, color: first.color }
    for (const item of items) {
      const spoke = spokes.get(item.variable) ?? { description: item.description, values: {} }
      spoke.values[key] = latestValue(item.values) ?? 0
      spokes.set(item.variable, spoke)
    }
  }
  return {
    type: 'radar',
    question,
    dataKey: 'spoke',
    categories,
    data: [...spokes.values()].map(spoke => ({ spoke: spoke.description, ...spoke.values })),
  }
}

function bubbleChart(question: string, series: FoundSeries[]) {
  const xSeries = series[0]
  const ySeries = series[1]
  if (!xSeries || !ySeries)
    return failure('a bubble chart needs two series.')
  const sizeSeries = series[2]
  const yByTime = new Map(ySeries.time.map((unix, index) => [unix, ySeries.values[index]]))
  const sizeByTime = sizeSeries
    ? new Map(sizeSeries.time.map((unix, index) => [unix, sizeSeries.values[index]]))
    : null
  const data: Array<{ x: number, y: number, size: number, group: string }> = []
  for (const [index, unix] of xSeries.time.entries()) {
    const x = xSeries.values[index]
    const y = typeof unix === 'number' ? yByTime.get(unix) : undefined
    if (typeof x !== 'number' || typeof y !== 'number' || typeof unix !== 'number')
      continue
    const sized = sizeByTime?.get(unix)
    data.push({
      x,
      y,
      size: typeof sized === 'number' ? sized : 1,
      group: 'points',
    })
  }
  return {
    ok: true as const,
    chart: {
      type: 'bubble' as const,
      question,
      xKey: 'x' as const,
      yKey: 'y' as const,
      sizeKey: 'size' as const,
      categoryKey: 'group' as const,
      categories: { points: { name: xSeries.label, color: xSeries.color } },
      data,
    },
  }
}

function candlestickChart(question: string, series: FoundSeries[]) {
  if (series.some(item => item.section !== 'hourly'))
    return failure('a candlestick chart needs an hourly series.')
  const offset = sharedOffset(series)
  const sets = series.map((item) => {
    const days = new Map<string, number[]>()
    for (const [index, unix] of item.time.entries()) {
      const value = item.values[index]
      if (typeof value !== 'number' || typeof unix !== 'number')
        continue
      const day = formatTime(unix, offset).slice(0, 10)
      days.set(day, [...(days.get(day) ?? []), value])
    }
    return {
      name: item.label,
      color: item.color,
      data: [...days.entries()].map(([label, values]) => ({
        label,
        open: values[0] ?? 0,
        high: Math.max(...values),
        low: Math.min(...values),
        close: values[values.length - 1] ?? 0,
      })),
    }
  })
  return { ok: true as const, chart: { type: 'candlestick' as const, question, sets } }
}

function statusChart(question: string, series: FoundSeries[]): ConversationChart {
  const first = series[0]
  const offset = first ? sharedOffset([first]) : null
  const data = []
  const categories: Record<string, { name: string, color?: string }> = {}
  if (first) {
    for (const [index, unix] of first.time.entries()) {
      const value = first.values[index]
      if (typeof value !== 'number' || typeof unix !== 'number')
        continue
      const status = String(value)
      categories[status] = { name: status, color: first.color }
      data.push({ status, label: formatTime(unix, offset), value })
    }
  }
  return { type: 'status-tracker', question, data, categories }
}

function sankeyChart(question: string, series: FoundSeries[]): ConversationChart {
  const nodes = new Map<string, { id: string, name: string }>()
  const links = []
  for (const item of series) {
    const source = `place:${item.place}`
    const target = `variable:${item.variable}`
    nodes.set(source, { id: source, name: item.place })
    nodes.set(target, { id: target, name: item.description })
    links.push({
      source,
      target,
      value: latestValue(item.values) ?? 0,
    })
  }
  return { type: 'sankey', question, nodes: [...nodes.values()], links }
}

function dottedMap(question: string, series: FoundSeries[]): ConversationChart {
  return {
    type: 'dotted-map',
    question,
    pins: series.map(item => ({
      id: item.key,
      lat: item.latitude,
      lng: item.longitude,
      label: String(latestValue(item.values)),
      color: item.color,
    })),
  }
}

function topojsonMap(question: string, series: FoundSeries[]): ConversationChart {
  return {
    type: 'topojson-map',
    question,
    points: series.map(item => ({
      id: item.key,
      latitude: item.latitude,
      longitude: item.longitude,
      label: String(latestValue(item.values)),
      color: item.color,
    })),
  }
}

export function buildChart(input: {
  type: unknown
  question: unknown
  series: unknown
  weather: WeatherResponse | null
  places: PlaceMatch[]
}): { ok: true, chart: ConversationChart } | { ok: false, sentence: string } {
  if (!input.weather)
    return failure('there is no Weather response yet.')
  if (typeof input.question !== 'string' || input.question.trim() === '')
    return failure('a chart needs the question it answers.')
  const type = typeof input.type === 'string' ? chartTypes[input.type.trim().toLowerCase()] : undefined
  if (!type)
    return failure(`${String(input.type)} is not a chart type this tool accepts.`)
  if (!Array.isArray(input.series) || input.series.length === 0)
    return failure('a chart needs at least one series.')

  const series: ChartSeriesInput[] = []
  for (const item of input.series) {
    if (typeof item !== 'object' || item === null)
      return failure('a series needs a section, a variable, coordinates, and a color.')
    const record = item as Record<string, unknown>
    series.push({
      section: record.section as ChartSeriesInput['section'],
      variable: record.variable as string,
      latitude: record.latitude as number,
      longitude: record.longitude as number,
      color: record.color as string,
    })
  }

  const located = readSeries({ weather: input.weather, places: input.places, series })
  if (!located.ok)
    return located

  const question = input.question.trim()
  if (type === 'line' || type === 'area' || type === 'bar')
    return { ok: true, chart: axisChart(type, question, located.found) }
  if (type === 'donut' || type === 'radial-bar' || type === 'funnel')
    return { ok: true, chart: partChart(type, question, located.found) }
  if (type === 'radar')
    return { ok: true, chart: radarChart(question, located.found) }
  if (type === 'bubble')
    return bubbleChart(question, located.found)
  if (type === 'candlestick')
    return candlestickChart(question, located.found)
  if (type === 'status-tracker')
    return { ok: true, chart: statusChart(question, located.found) }
  if (type === 'sankey')
    return { ok: true, chart: sankeyChart(question, located.found) }
  if (type === 'dotted-map')
    return { ok: true, chart: dottedMap(question, located.found) }
  return { ok: true, chart: topojsonMap(question, located.found) }
}
