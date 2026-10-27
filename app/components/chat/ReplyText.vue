<script setup lang="ts">
import { computed } from 'vue'
import ReplyInlines from './ReplyInlines.vue'
import { parseReply } from './reply-markdown'

const props = defineProps<{
  text: string
}>()

const blocks = computed(() => parseReply(props.text))
</script>

<template>
  <div class="flex flex-col gap-2">
    <template
      v-for="(block, index) in blocks"
      :key="index"
    >
      <p v-if="block.type === 'paragraph'">
        <ReplyInlines :inlines="block.inlines" />
      </p>
      <p
        v-else-if="block.type === 'heading'"
        class="font-medium"
      >
        <ReplyInlines :inlines="block.inlines" />
      </p>
      <ul
        v-else-if="block.type === 'list' && !block.ordered"
        class="list-disc pl-5"
      >
        <li
          v-for="(item, itemIndex) in block.items"
          :key="itemIndex"
        >
          <ReplyInlines :inlines="item" />
        </li>
      </ul>
      <ol
        v-else-if="block.type === 'list'"
        class="list-decimal pl-5"
      >
        <li
          v-for="(item, itemIndex) in block.items"
          :key="itemIndex"
        >
          <ReplyInlines :inlines="item" />
        </li>
      </ol>
      <div
        v-else-if="block.type === 'table'"
        class="overflow-x-auto"
      >
        <table class="w-full border-collapse text-left">
          <thead>
            <tr class="border-b">
              <th
                v-for="(cell, cellIndex) in block.header"
                :key="cellIndex"
                class="px-2 py-1 font-medium"
              >
                <ReplyInlines :inlines="cell" />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, rowIndex) in block.rows"
              :key="rowIndex"
              class="border-b border-current/10"
            >
              <td
                v-for="(cell, cellIndex) in row"
                :key="cellIndex"
                class="px-2 py-1 align-top"
              >
                <ReplyInlines :inlines="cell" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <pre
        v-else
        class="bg-background overflow-x-auto rounded px-2 py-1 font-mono text-xs"
      >{{ block.text }}</pre>
    </template>
  </div>
</template>
