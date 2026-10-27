<script setup lang="ts">
import type { ConversationRow } from '@/components/chat/conversation-rows'
import { CloudSunRain } from '@lucide/vue'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Message, MessageContent } from '@/components/ui/message'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller'

defineProps<{
  rows: ConversationRow[]
}>()
</script>

<template>
  <div class="flex min-h-0 min-w-0 flex-1 flex-col">
    <MessageScrollerProvider
      :auto-scroll="true"
      default-scroll-position="end"
    >
      <MessageScroller class="min-h-0 flex-1">
        <MessageScrollerViewport class="min-h-0 flex-1">
          <MessageScrollerContent class="pb-6">
            <Empty
              v-if="rows.length === 0"
              class="my-auto border-0"
            >
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CloudSunRain />
                </EmptyMedia>
                <EmptyTitle>Weather chat</EmptyTitle>
                <EmptyDescription>
                  Ask for weather data anywhere.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
            <MessageScrollerItem
              v-for="(row, index) in rows"
              :key="row.id"
              :message-id="row.id"
              :scroll-anchor="index === rows.length - 1 && row.kind === 'reply'"
            >
              <Message
                v-if="row.kind === 'person'"
                align="end"
              >
                <MessageContent>
                  <Bubble>
                    <BubbleContent>{{ row.text }}</BubbleContent>
                  </Bubble>
                </MessageContent>
              </Message>
              <Message v-else-if="row.kind === 'activity'">
                <MessageContent>
                  <p
                    class="text-muted-foreground flex items-center gap-2 text-sm"
                    role="status"
                  >
                    <span
                      class="bg-foreground size-1.5 animate-pulse rounded-full"
                      aria-hidden="true"
                    />
                    {{ row.tool }}
                  </p>
                </MessageContent>
              </Message>
              <Message v-else>
                <MessageContent>
                  <Bubble
                    variant="secondary"
                    :class="row.chart ? 'w-full max-w-full' : undefined"
                  >
                    <BubbleContent :class="row.chart ? 'w-full' : undefined">
                      <p>{{ row.text }}</p>
                      <p
                        v-if="row.chart && row.chart.question !== row.text"
                        class="text-muted-foreground mt-2 text-sm"
                      >
                        {{ row.chart.question }}
                      </p>
                      <ChartConversationChart
                        v-if="row.chart"
                        class="mt-3 w-full"
                        :chart="row.chart"
                      />
                    </BubbleContent>
                  </Bubble>
                </MessageContent>
              </Message>
            </MessageScrollerItem>
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton class="cursor-pointer" />
      </MessageScroller>
    </MessageScrollerProvider>
  </div>
</template>
