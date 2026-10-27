import type { UIMessage } from 'ai'
import { Chat } from '@ai-sdk/vue'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface StoredConversation {
  id: string
  title: string
  draft: string
}

export const useConversationStore = defineStore('conversation', () => {
  const conversations = ref<StoredConversation[]>([])
  const activeId = ref<string | null>(null)
  const chats = new Map<string, Chat<UIMessage>>()
  let nextNumber = 0

  function chat(id: string) {
    const existing = chats.get(id)
    if (existing)
      return existing
    const created = new Chat<UIMessage>({ id })
    chats.set(id, created)
    return created
  }

  const active = computed(() =>
    conversations.value.find(conversation => conversation.id === activeId.value) ?? null,
  )

  function create() {
    const current = active.value
    if (current && chat(current.id).messages.length === 0 && current.draft.trim() === '')
      return current

    nextNumber += 1
    const id = `conversation-${nextNumber}`
    const conversation: StoredConversation = {
      id,
      title: 'New chat',
      draft: '',
    }
    chat(id)
    conversations.value.unshift(conversation)
    activeId.value = id
    return conversation
  }

  function select(id: string) {
    activeId.value = id
  }

  function titleFromPerson(text: string) {
    const current = active.value
    const trimmed = text.trim()
    if (!current || current.title !== 'New chat' || trimmed === '')
      return
    current.title = trimmed
  }

  create()

  return { conversations, activeId, active, create, select, titleFromPerson, chat }
})
