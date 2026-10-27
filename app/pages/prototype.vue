<script setup lang="ts">
// PROTOTYPE. Throwaway route. Not the Conversation we will ship.
// Question: Does this canned page match the Conversation we should implement?
// One page, not a set of visual variants.
//
// Assumptions on screen, so they can be rejected:
// - Tool activity is one line in the assistant's place. It names the Tool, then the reply replaces it.
// - Each Tool stays for 900ms: Geocode tool, then Weather tool, then Chart tool.
// - After the reply, the prompt works again. Another send appends another exchange.
// - "Show a rejection" appends a person message and a reply with no chart and no Tool activity.
// - Empty thread: "Ask for weather data anywhere."
// - Rejection sentence: "I couldn't draw a chart for that."
// - Conversations live in a Pinia store for this browser session only.
import { ArrowUpIcon } from '@lucide/vue'
import { onScopeDispose } from 'vue'
import type { PrototypeToolName } from '@/components/chat/PrototypeThread.vue'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { useConversationStore } from '@/stores/conversation'

const tools = ['Geocode tool', 'Weather tool', 'Chart tool'] as const satisfies readonly PrototypeToolName[]
const stepMs = 900

const store = useConversationStore()
const timers = new Map<string, ReturnType<typeof setTimeout>[]>()

const draft = computed({
  get: () => store.active?.draft ?? '',
  set: (value: string) => {
    if (store.active)
      store.active.draft = value
  },
})

const busy = computed(() => {
  const phase = store.active?.phase
  return phase === 'Geocode tool' || phase === 'Weather tool' || phase === 'Chart tool'
})

const stateLine = computed(() => {
  const conversation = store.active
  if (!conversation)
    return 'empty'
  const summary = conversation.items.map((item) => {
    if (item.kind === 'person')
      return 'person'
    if (item.kind === 'activity')
      return item.tool
    return item.chart ? 'reply+chart' : 'reply'
  }).join(' · ')
  const body = summary ? `${conversation.phase} · ${summary}` : conversation.phase
  return `${conversation.title} · ${body}`
})

function clearTimers(conversationId: string) {
  const existing = timers.get(conversationId) ?? []
  for (const timer of existing)
    clearTimeout(timer)
  timers.delete(conversationId)
}

function later(conversationId: string, fn: () => void, ms: number) {
  const timer = setTimeout(fn, ms)
  const existing = timers.get(conversationId) ?? []
  existing.push(timer)
  timers.set(conversationId, existing)
}

onScopeDispose(() => {
  for (const conversationId of timers.keys())
    clearTimers(conversationId)
})

let nextNumber = 0

function nextId() {
  nextNumber += 1
  return `prototype-${nextNumber}`
}

function send() {
  const conversation = store.active
  const text = conversation?.draft.trim() ?? ''
  if (!conversation || !text || busy.value)
    return
  conversation.draft = ''
  if (conversation.title === 'New chat')
    conversation.title = text
  conversation.items.push({ id: nextId(), kind: 'person', text })
  const activityId = nextId()
  const firstTool = tools[0]
  conversation.items.push({ id: activityId, kind: 'activity', tool: firstTool })
  conversation.phase = firstTool
  const conversationId = conversation.id

  for (let index = 1; index < tools.length; index += 1) {
    const tool = tools[index]
    if (!tool)
      continue
    later(conversationId, () => {
      const current = store.find(conversationId)
      const activity = current?.items.find(item => item.id === activityId)
      if (!current || !activity || activity.kind !== 'activity')
        return
      activity.tool = tool
      current.phase = tool
    }, index * stepMs)
  }

  later(conversationId, () => {
    const current = store.find(conversationId)
    if (!current)
      return
    current.items = current.items.filter(item => item.id !== activityId)
    current.items.push({
      id: nextId(),
      kind: 'reply',
      text: 'Here are the next 24 hours.',
      chart: true,
    })
    current.phase = 'reply'
    clearTimers(conversationId)
  }, tools.length * stepMs)
}

function showRejection() {
  const conversation = store.active
  if (!conversation || busy.value)
    return
  clearTimers(conversation.id)
  const text = conversation.draft.trim() || 'Weather in Atlantis'
  conversation.draft = ''
  if (conversation.title === 'New chat')
    conversation.title = text
  conversation.items.push({ id: nextId(), kind: 'person', text })
  conversation.items.push({
    id: nextId(),
    kind: 'reply',
    text: 'I couldn\'t draw a chart for that.',
    chart: false,
  })
  conversation.phase = 'rejection'
}
</script>

<template>
  <SidebarProvider class="h-dvh">
    <ChatPrototypeSidebar />
    <SidebarInset class="h-dvh min-h-0 overflow-hidden">
      <header class="flex h-12 shrink-0 items-center px-2">
        <SidebarTrigger class="cursor-pointer" />
      </header>
      <div class="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4">
        <ChatPrototypeThread
          class="min-h-0 flex-1"
          :items="store.active?.items ?? []"
        />
        <form
          class="flex flex-col gap-2 pb-4"
          @submit.prevent="send"
        >
          <InputGroup>
            <InputGroupTextarea
              v-model="draft"
              placeholder="Ask for weather data anywhere."
              :disabled="busy"
              @keydown.enter.exact.prevent="send"
            />
            <InputGroupAddon align="block-end">
              <InputGroupButton
                class="ml-auto cursor-pointer"
                variant="default"
                size="icon-sm"
                :disabled="busy || draft.trim().length === 0"
                aria-label="Send"
                @click="send"
              >
                <ArrowUpIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <Button
            type="button"
            variant="ghost"
            class="cursor-pointer self-start"
            :disabled="busy"
            @click="showRejection"
          >
            Show a rejection
          </Button>
        </form>
      </div>
    </SidebarInset>
  </SidebarProvider>
  <p
    class="bg-foreground text-background fixed top-3 left-1/2 z-50 -translate-x-1/2 rounded-full px-3 py-1 font-mono text-xs"
    data-prototype-state
  >
    PROTOTYPE · {{ stateLine }}
  </p>
</template>
