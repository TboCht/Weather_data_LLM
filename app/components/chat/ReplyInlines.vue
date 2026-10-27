<script setup lang="ts">
import type { Inline } from './reply-markdown'
import ReplyInlines from './ReplyInlines.vue'

defineProps<{
  inlines: Inline[]
}>()
</script>

<template>
  <template
    v-for="(inline, index) in inlines"
    :key="index"
  >
    <br v-if="inline.type === 'break'">
    <strong
      v-else-if="inline.type === 'strong'"
      class="font-semibold"
    >
      <ReplyInlines :inlines="inline.inlines" />
    </strong>
    <em v-else-if="inline.type === 'em'">
      <ReplyInlines :inlines="inline.inlines" />
    </em>
    <code
      v-else-if="inline.type === 'code'"
      class="bg-background rounded px-1 font-mono text-xs"
    >{{ inline.text }}</code>
    <template v-else>{{ inline.text }}</template>
  </template>
</template>
