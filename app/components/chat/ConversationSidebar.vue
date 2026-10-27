<script setup lang="ts">
import { Plus } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { useConversationStore } from '@/stores/conversation'

const store = useConversationStore()
</script>

<template>
  <Sidebar>
    <SidebarHeader class="gap-8 p-4">
      <p class="px-2 text-sm font-semibold">
        Weather chat
      </p>
      <Button
        type="button"
        variant="outline"
        class="w-full cursor-pointer justify-start"
        @click="store.create()"
      >
        <Plus />
        New chat
      </Button>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup class="gap-3 px-4 pt-4">
        <SidebarGroupLabel class="text-muted-foreground h-auto px-2 text-xs">
          Recent
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu class="gap-1">
            <SidebarMenuItem
              v-for="conversation in store.conversations"
              :key="conversation.id"
            >
              <SidebarMenuButton
                class="cursor-pointer data-active:bg-primary! data-active:text-primary-foreground!"
                :is-active="conversation.id === store.activeId"
                @click="store.select(conversation.id)"
              >
                <span>{{ conversation.title }}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
</template>
