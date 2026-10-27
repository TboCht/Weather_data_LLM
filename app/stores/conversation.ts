import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { PrototypeItem, PrototypeToolName } from '@/components/chat/PrototypeThread.vue'

export type ConversationPhase = 'empty' | PrototypeToolName | 'reply' | 'rejection'

export interface StoredConversation {
  id: string
  title: string
  items: PrototypeItem[]
  draft: string
  phase: ConversationPhase
}

export const useConversationStore = defineStore('conversation', () => {
  const conversations = ref<StoredConversation[]>([])
  const activeId = ref<string | null>(null)
  let nextNumber = 0

  const active = computed(() =>
    conversations.value.find(conversation => conversation.id === activeId.value) ?? null,
  )

  function create() {
    const current = active.value
    if (current && current.items.length === 0 && current.draft.trim() === '')
      return current

    nextNumber += 1
    const conversation: StoredConversation = {
      id: `conversation-${nextNumber}`,
      title: 'New chat',
      items: [],
      draft: '',
      phase: 'empty',
    }
    conversations.value.unshift(conversation)
    activeId.value = conversation.id
    return conversation
  }

  function select(id: string) {
    activeId.value = id
  }

  function find(id: string) {
    return conversations.value.find(conversation => conversation.id === id) ?? null
  }

  create()

  return { conversations, activeId, active, create, select, find }
})
