<script setup lang="ts">
import type { UIMessage } from 'ai'
import { getToolName, isToolUIPart } from 'ai'
import { computed, ref } from 'vue'
import { toolActivityLabel } from './conversation-rows'

const props = defineProps<{
  messages: UIMessage[]
}>()

const showRaw = ref(false)

const turn = computed(() => {
  const assistant = [...props.messages].reverse().find(message => message.role === 'assistant')
  if (!assistant)
    return { tools: [] as string[], reasoning: '', calls: [] as Array<{ tool: string, input: unknown, output: unknown }> }

  const tools: string[] = []
  const calls: Array<{ tool: string, input: unknown, output: unknown }> = []
  let reasoning = ''
  for (const part of assistant.parts) {
    if (part.type === 'reasoning')
      reasoning += part.text
    if (!isToolUIPart(part))
      continue
    const tool = toolActivityLabel(getToolName(part))
    if (!tools.includes(tool))
      tools.push(tool)
    calls.push({
      tool,
      input: 'input' in part ? part.input : undefined,
      output: part.state === 'output-available'
        ? part.output
        : part.state === 'output-error'
          ? part.errorText
          : undefined,
    })
  }
  return { tools, reasoning, calls }
})
</script>

<template>
  <aside class="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto border-l p-3 text-sm">
    <p class="font-medium">
      Turn
    </p>
    <p
      v-if="turn.tools.length === 0"
      class="text-muted-foreground"
    >
      Nothing is running.
    </p>
    <ol
      v-else
      class="flex flex-col gap-1"
    >
      <li
        v-for="tool in turn.tools"
        :key="tool"
      >
        {{ tool }}
      </li>
    </ol>
    <label class="flex items-start gap-2">
      <input
        v-model="showRaw"
        type="checkbox"
        class="mt-1"
      >
      <span>Show raw tool data and reasoning</span>
    </label>
    <div
      v-if="showRaw"
      class="flex flex-col gap-3"
    >
      <section>
        <p class="text-muted-foreground mb-1 text-xs">
          Reasoning
        </p>
        <p class="whitespace-pre-wrap">
          {{ turn.reasoning || 'None.' }}
        </p>
      </section>
      <section
        v-for="(call, index) in turn.calls"
        :key="`${call.tool}-${index}`"
      >
        <p class="mb-1 font-medium">
          {{ call.tool }}
        </p>
        <pre class="overflow-x-auto text-xs">{{ JSON.stringify({ input: call.input, output: call.output }, null, 2) }}</pre>
      </section>
    </div>
  </aside>
</template>
