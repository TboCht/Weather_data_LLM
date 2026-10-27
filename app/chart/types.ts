export interface ChartCategory {
  name: string
  color?: string
  yAxis?: string
}

export interface ChartAxis {
  orientation: 'left' | 'right'
  label: string
}

export interface AxisChart {
  type: 'line' | 'area' | 'bar'
  question: string
  data: Array<Record<string, string | number>>
  categories: Record<string, ChartCategory>
  xAxis: string
  yLabel?: string
  yAxes?: Record<string, ChartAxis>
}

export interface PartChart {
  type: 'donut' | 'radial-bar' | 'funnel'
  question: string
  data: Array<{ name: string, value: number }>
  categories: Record<string, ChartCategory>
  nameKey: 'name'
  valueKey: 'value'
}

export interface RadarChartResult {
  type: 'radar'
  question: string
  data: Array<Record<string, string | number>>
  categories: Record<string, ChartCategory>
  dataKey: 'spoke'
}

export interface BubblePoint {
  x: number
  y: number
  size: number
  group: string
}

export interface BubbleChartResult {
  type: 'bubble'
  question: string
  data: BubblePoint[]
  categories: Record<string, ChartCategory>
  xKey: 'x'
  yKey: 'y'
  sizeKey: 'size'
  categoryKey: 'group'
}

export interface CandleSet {
  name: string
  color: string
  data: Array<{ label: string, open: number, high: number, low: number, close: number }>
}

export interface CandlestickChartResult {
  type: 'candlestick'
  question: string
  sets: CandleSet[]
}

export interface StatusChartResult {
  type: 'status-tracker'
  question: string
  data: Array<{ status: string, label: string, value: number }>
  categories: Record<string, ChartCategory>
}

export interface SankeyChartResult {
  type: 'sankey'
  question: string
  nodes: Array<{ id: string, name: string }>
  links: Array<{ source: string, target: string, value: number }>
}

export interface DottedMapResult {
  type: 'dotted-map'
  question: string
  pins: Array<{ id: string, lat: number, lng: number, label: string, color: string }>
}

export interface TopojsonMapResult {
  type: 'topojson-map'
  question: string
  points: Array<{ id: string, latitude: number, longitude: number, label: string, color: string }>
}

export type ConversationChart
  = AxisChart
  | PartChart
  | RadarChartResult
  | BubbleChartResult
  | CandlestickChartResult
  | StatusChartResult
  | SankeyChartResult
  | DottedMapResult
  | TopojsonMapResult
