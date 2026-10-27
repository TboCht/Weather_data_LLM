import type { UIMessage } from 'ai'
import { conversationModel } from '../chat/model'
import { streamConversation } from '../chat/open-conversation'
import { liveOpenMeteo } from '../weather/live-client'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body || !Array.isArray(body.messages)) {
    throw createError({ statusCode: 400, statusMessage: 'Messages are required.' })
  }

  const result = await streamConversation({
    messages: body.messages as UIMessage[],
    model: conversationModel(useRuntimeConfig().anthropicApiKey),
    openMeteo: liveOpenMeteo,
  })
  return result.toUIMessageStreamResponse({ sendReasoning: true })
})
