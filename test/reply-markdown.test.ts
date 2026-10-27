import assert from 'node:assert/strict'
import test from 'node:test'
import { parseReply, presentReply } from '../app/components/chat/reply-markdown.ts'
import { projectBriefing } from '../server/chat/briefing.ts'

const week = `Here's the weather forecast for **Paris, France** this week:

| Day | Conditions | Max | Min | Rain |
|-----|-----------|-----|-----|------|
| Tue 27 | 🌦️ Slight showers | 16.6°C | 10.7°C | 0.2 mm |
| Wed 28 | 🌤️ Partly cloudy | 15.4°C | 8.0°C | 0 mm |

🌡️ A mild week, with temperatures dropping to as low as **5°C** by Friday.`

test('a forecast table renders as a table and drops emoji', () => {
  const blocks = parseReply(week)
  assert.equal(blocks[0]?.type, 'paragraph')
  if (blocks[0]?.type !== 'paragraph')
    return
  assert.equal(blocks[0].inlines.some(inline => inline.type === 'strong'), true)
  assert.equal(blocks[1]?.type, 'table')
  if (blocks[1]?.type !== 'table')
    return
  assert.equal(blocks[1].header.length, 5)
  assert.equal(blocks[1].rows.length, 2)
  const conditions = blocks[1].rows[0]?.[1]
  assert.deepEqual(conditions, [{ type: 'text', text: 'Slight showers' }])
  assert.equal(JSON.stringify(blocks).includes('🌦️'), false)
  assert.equal(blocks[2]?.type, 'paragraph')
  if (blocks[2]?.type !== 'paragraph')
    return
  assert.equal(blocks[2].inlines.some(inline => inline.type === 'strong' && JSON.stringify(inline).includes('5°C')), true)
})

test('curly quotes and em dashes become plain punctuation', () => {
  assert.equal(presentReply('Total rainfall was “about” 10 mm — mostly in spring.'), 'Total rainfall was "about" 10 mm, mostly in spring.')
})

test('the answer rules are part of the same briefing, not a later call', () => {
  assert.match(projectBriefing, /Write the answer in this same turn/)
  assert.match(projectBriefing, /Do not use emoji/)
  assert.match(projectBriefing, /Do not spend another step rewriting it/)
})
