import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { createPinia, setActivePinia } from 'pinia'
import type { UIMessage } from 'ai'
import { useConversationStore } from '../app/stores/conversation.ts'

beforeEach(() => {
  setActivePinia(createPinia())
})

test('an empty Conversation is not duplicated', () => {
  const store = useConversationStore()
  const first = store.active
  assert.ok(first)
  assert.equal(store.create().id, first.id)
  assert.equal(store.conversations.length, 1)
  assert.equal(first.title, 'New chat')
})

test('a drafted Conversation starts another one', () => {
  const store = useConversationStore()
  const first = store.active
  assert.ok(first)
  first.draft = 'Weather in Paris'
  const second = store.create()
  assert.notEqual(second.id, first.id)
  assert.equal(store.conversations[0]?.id, second.id)
  assert.equal(store.activeId, second.id)
})

test('the first person message titles the Conversation', () => {
  const store = useConversationStore()
  store.titleFromPerson('Weather in Paris')
  assert.equal(store.active?.title, 'Weather in Paris')
  store.titleFromPerson('Weather in Lyon')
  assert.equal(store.active?.title, 'Weather in Paris')
})

test('selecting a Conversation keeps the other one', () => {
  const store = useConversationStore()
  const first = store.active
  assert.ok(first)
  const person: UIMessage = {
    id: 'person-1',
    role: 'user',
    parts: [{ type: 'text', text: 'Weather in Paris' }],
  }
  store.chat(first.id).messages = [person]
  store.titleFromPerson('Weather in Paris')
  const second = store.create()
  store.select(first.id)
  assert.equal(store.activeId, first.id)
  assert.equal(store.active?.title, 'Weather in Paris')
  assert.equal(store.chat(first.id).messages[0]?.id, 'person-1')
  assert.equal(store.chat(second.id).messages.length, 0)
})
