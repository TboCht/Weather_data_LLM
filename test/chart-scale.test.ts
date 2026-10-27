import assert from 'node:assert/strict'
import test from 'node:test'
import { buildChart } from '../app/chart/build.ts'
import { chartGuide } from '../app/chart/guide.ts'
import { valueDomain } from '../app/chart/scale.ts'
import type { WeatherResponse } from '../server/weather/types.ts'

test('the chart rule lets an axis start away from zero', () => {
  assert.match(chartGuide, /starts near the data/)
})

test('pressure stays off a zero baseline', () => {
  assert.deepEqual(valueDomain([1012, 1015, 1008]), [1005, 1020])
})

test('a series that reaches zero still starts there', () => {
  const domain = valueDomain([0, 0.2, 1.2])
  assert.equal(domain?.[0], 0)
  assert.ok((domain?.[1] ?? 0) >= 1.2)
})

test('three days of pressure are drawn around the measurements', () => {
  const start = Date.UTC(2026, 9, 27) / 1000
  const values = [1012, 1015, 1008]
  const weather: WeatherResponse = {
    locations: [{
      latitude: 48.86,
      longitude: 2.35,
      timezone: 'Europe/Paris',
      utcOffsetSeconds: 0,
      daily: {
        time: values.map((_, index) => start + index * 86400),
        variables: [{
          code: 'pressure_msl',
          description: 'Mean Sea Level Pressure',
          unit: 'hPa',
          values,
        }],
      },
    }],
  }
  const chart = buildChart({
    type: 'line',
    question: 'How does the pressure change over the next 3 days?',
    series: [{
      section: 'daily',
      variable: 'pressure_msl',
      latitude: 48.86,
      longitude: 2.35,
      color: '#7f8c8d',
    }],
    weather,
    places: [{ name: 'Paris', country_code: 'FR', latitude: 48.86, longitude: 2.35 }],
  })
  assert.equal(chart.ok, true)
  if (!chart.ok || chart.chart.type !== 'line')
    return
  assert.deepEqual(chart.chart.yDomain, [1005, 1020])
  assert.equal(chart.chart.yLabel, 'hPa')
})
