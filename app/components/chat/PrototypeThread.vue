<script setup lang="ts">
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

export type PrototypeToolName = 'Geocode tool' | 'Weather tool' | 'Chart tool'

export type PrototypeItem
  = { id: string, kind: 'person', text: string }
    | { id: string, kind: 'activity', tool: PrototypeToolName }
    | { id: string, kind: 'reply', text: string, chart: boolean }

defineProps<{
  items: PrototypeItem[]
}>()
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <MessageScrollerProvider
      :auto-scroll="true"
      default-scroll-position="end"
    >
      <MessageScroller class="min-h-0 flex-1">
      <MessageScrollerViewport class="min-h-0 flex-1">
        <MessageScrollerContent class="pt-14">
          <Empty
            v-if="items.length === 0"
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
            v-for="(item, index) in items"
            :key="item.id"
            :message-id="item.id"
            :scroll-anchor="index === items.length - 1"
          >
            <Message
              v-if="item.kind === 'person'"
              align="end"
            >
              <MessageContent>
                <Bubble>
                  <BubbleContent>{{ item.text }}</BubbleContent>
                </Bubble>
              </MessageContent>
            </Message>
            <Message v-else-if="item.kind === 'activity'">
              <MessageContent>
                <p
                  class="text-muted-foreground flex items-center gap-2 text-sm"
                  role="status"
                >
                  <span
                    class="bg-foreground size-1.5 animate-pulse rounded-full"
                    aria-hidden="true"
                  />
                  {{ item.tool }}
                </p>
              </MessageContent>
            </Message>
            <Message v-else>
              <MessageContent>
                <Bubble
                  variant="secondary"
                  :class="item.chart ? 'w-full max-w-full' : undefined"
                >
                  <BubbleContent :class="item.chart ? 'w-full' : undefined">
                    <p>{{ item.text }}</p>
                    <ChartPrototypeTemperatureChart
                      v-if="item.chart"
                      class="mt-3 w-full"
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
