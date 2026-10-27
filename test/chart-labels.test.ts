import assert from 'node:assert/strict'
import test from 'node:test'
import { buildChart } from '../app/chart/build.ts'
import type { WeatherResponse } from '../server/weather/types.ts'

const paris = {
  name: 'Paris',
  country_code: 'FR',
  latitude: 48.86,
  longitude: 2.35,
}

function dailyChart(start: number, count: number, offset: number) {
  const time = Array.from({ length: count }, (_, index) => start + index * 86400)
  const weather: WeatherResponse = {
    locations: [{
      latitude: paris.latitude,
      longitude: paris.longitude,
      timezone: 'Europe/Paris',
      utcOffsetSeconds: offset,
      daily: {
        time,
        variables: [{
          code: 'precipitation_sum',
          description: 'Precipitation Sum',
          unit: 'mm',
          values: time.map(() => 1),
        }],
      },
    }],
  }
  const chart = buildChart({
    type: 'line',
    question: 'Precipitation in Paris',
    series: [{
      section: 'daily',
      variable: 'precipitation_sum',
      latitude: paris.latitude,
      longitude: paris.longitude,
      color: '#2662d9',
    }],
    weather,
    places: [paris],
  })
  assert.equal(chart.ok, true)
  if (!chart.ok || chart.chart.type !== 'line')
    throw new Error('expected a line chart')
  return chart.chart.data.map(row => String(row.time))
}

test('a year of daily precipitation is labeled by day and month', () => {
  const offset = 3600
  const start = Date.UTC(2024, 0, 1) / 1000 - offset
  const labels = dailyChart(start, 366, offset)
  assert.equal(labels[0], '1 Jan')
  assert.equal(labels.at(-1), '31 Dec')
  assert.equal(labels.some(label => label.includes(':')), false)
  assert.equal(labels.some(label => label.includes('2024')), false)
})

test('a week of daily weather uses the weekday and the day', () => {
  const offset = 3600
  const start = Date.UTC(2026, 9, 27) / 1000 - offset
  assert.deepEqual(dailyChart(start, 7, offset), [
    'Tue 27',
    'Wed 28',
    'Thu 29',
    'Fri 30',
    'Sat 31',
    'Sun 1',
    'Mon 2',
  ])
})
