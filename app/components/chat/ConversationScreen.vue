<script setup lang="ts">
import { ArrowUpIcon } from '@lucide/vue'
import { conversationRows } from '@/components/chat/conversation-rows'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { SIDEBAR_COOKIE_NAME } from '@/components/ui/sidebar/utils'
import { useConversationStore } from '@/stores/conversation'

const store = useConversationStore()
// SidebarProvider writes "true"/"false"; Nuxt useCookie JSON-parses those to booleans.
const sidebarState = useCookie<boolean | string | null>(SIDEBAR_COOKIE_NAME)
const defaultOpen = String(sidebarState.value ?? true) !== 'false'

const draft = computed({
  get: () => store.active?.draft ?? '',
  set: (value: string) => {
    if (store.active)
      store.active.draft = value
  },
})

const activeChat = computed(() => {
  const id = store.activeId
  return id ? store.chat(id) : null
})

const messages = computed(() => activeChat.value?.messages ?? [])

const busy = computed(() => {
  const status = activeChat.value?.status
  return status === 'submitted' || status === 'streaming'
})

const rows = computed(() => conversationRows(messages.value, { complete: !busy.value }))

const errorMessage = computed(() => {
  const error = activeChat.value?.error
  if (!(error instanceof Error) || error.message.length > 180)
    return error ? 'The message could not be sent.' : ''
  return error.message
})

async function send() {
  const conversation = store.active
  const chat = activeChat.value
  const text = conversation?.draft.trim() ?? ''
  if (!conversation || !chat || text === '' || busy.value)
    return
  conversation.draft = ''
  store.titleFromPerson(text)
  await chat.sendMessage({ text })
}
</script>

<template>
  <SidebarProvider :default-open="defaultOpen" class="h-dvh">
    <ChatConversationSidebar />
    <SidebarInset class="h-dvh min-h-0 overflow-hidden">
      <header class="flex h-12 shrink-0 items-center px-2">
        <SidebarTrigger class="cursor-pointer" />
      </header>
      <div class="flex min-h-0 min-w-0 flex-1">
        <div class="mx-auto flex min-h-0 w-full min-w-0 max-w-3xl flex-1 flex-col gap-4 px-4">
          <ChatConversationThread
            class="min-h-0 flex-1"
            :rows="rows"
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
            <p
              v-if="errorMessage"
              class="text-destructive text-sm"
              role="alert"
            >
              {{ errorMessage }}
            </p>
          </form>
        </div>
        <DevOnly>
          <ChatTurnPanel :messages="messages" />
        </DevOnly>
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
