import { createAnthropic } from '@ai-sdk/anthropic'

export function conversationModel(apiKey: string) {
  return createAnthropic({ apiKey })('claude-sonnet-4-6')
}
