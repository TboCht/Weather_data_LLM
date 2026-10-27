# How a Nuxt server route calls Anthropic once with a tool and Zod

Research for [issue 5](https://github.com/TboCht/Weather_data_LLM/issues/5). One-shot `generateText` only. Checked 27 October 2026 against the live docs and the `main` branch of `vercel/ai`.

## Answer

Use the direct provider, not a gateway model string: `anthropic('claude-haiku-5-5')`. The AI SDK Anthropic page does not rank price. Anthropic’s own model overview calls that id the fastest current model, and Anthropic’s pricing page gives it the lowest listed token price. It is marked for tool use on both sites.

Define the tool with `tool({ inputSchema: z.object(...) })`. Leave `stopWhen` at its default, `isStepCount(1)`, so the call ends after one model generation plus that generation’s tool execution. `outputSchema` types the value `execute` returns; the current docs do not say the SDK parses it at runtime. Parse with Zod inside `execute` if the result must be checked.

Read the key in the server route from private `runtimeConfig` (`useRuntimeConfig(event)`), and pass it as `createAnthropic({ apiKey })`. Do not put it under `runtimeConfig.public`. Nuxt will not map an env var named `ANTHROPIC_API_KEY` onto `runtimeConfig` when a built server starts. That name is what `@ai-sdk/anthropic` reads if `apiKey` is omitted, and Nuxt exposes it to `nuxt.config` at dev and build time. The runtime override for a private key `anthropicApiKey` is `NUXT_ANTHROPIC_API_KEY`.

The page should read `result.staticToolResults`, not `result.text`. Each static result is `{ type: 'tool-result', toolCallId, toolName, input, output, ... }`, and `output` is the value `execute` returned.

## Model id

The AI SDK Anthropic provider page does not rank models by price or latency. Its capabilities table marks **Tool Usage** for these ids, among others: `claude-haiku-5-5`, `claude-haiku-4-5`, `claude-sonnet-5-5`, `claude-sonnet-5`, `claude-opus-5-5`, `claude-opus-5`, `claude-fable-5-1`, and `claude-fable-5`. The language-model example on that page is `anthropic('claude-haiku-5-5')`. The page says the table is popular models only and points to Anthropic’s docs for the full list. Source: [AI SDK Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic), “Language Models” and “Model Capabilities”.

Anthropic’s current comparison names four models and says all of them support tool use. Claude Haiku 5.5 is the column with comparative latency **Fastest**, description “high-volume, latency-sensitive tasks”, price “From $0.10 / input MTok, From $0.50 / output MTok”, and Claude API id `claude-haiku-5-5`. Source: [Models overview](https://docs.anthropic.com/en/docs/about-claude/models/overview), “Compare models”.

Anthropic’s pricing table lists Claude Haiku 5.5 at **$0.10 / MTok input and $0.50 / MTok output** for prompts up to 100,000 tokens, and **$0.50 / MTok input and $2.50 / MTok output** above that. Those are the lowest input and output rates in that table. Claude Haiku 4.5 is $1 / $5. Retired Claude Haiku 3.5 is $0.80 / $4, still above Haiku 5.5’s base rate and above its over-100k input rate. The same page lists Claude Haiku 5.5 in the tool-use system-prompt table (`auto` / `none`: 286 tokens; `any` / `tool`: 406 tokens) and says client-side tools are priced like any other request. Source: [Pricing](https://docs.anthropic.com/en/docs/about-claude/pricing), “Model pricing”, “Long context pricing”, and “Tool use pricing”.

Use the hyphenated id with the direct provider. Gateway examples on the same AI SDK page use a different string shape, such as `"anthropic/claude-sonnet-5.5"`. This question is the direct provider. Source: [AI SDK Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic), “Using `@ai-sdk/anthropic`” and “Language Models”.

The AI SDK “Fast Mode” section is a `speed: 'fast'` option documented for `claude-opus-4-6`. It is not the small model. Source: [AI SDK Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic), “Fast Mode”.

## One `generateText` call, one tool round

Install surface the provider docs name: `ai` and `@ai-sdk/anthropic`. Create the model with the default `anthropic` export, or with `createAnthropic` when the key is passed in (next section). Source: [AI SDK Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic), “Provider Instance” and “Language Models”.

```ts
import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText, isStepCount, tool } from 'ai'
import { z } from 'zod'

const anthropic = createAnthropic({ apiKey })

const result = await generateText({
  model: anthropic('claude-haiku-5-5'),
  stopWhen: isStepCount(1),
  prompt,
  tools: {
    weather: tool({
      description: 'Get the weather in a location',
      inputSchema: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72,
      }),
    }),
  },
})
```

The `tools` argument is an object whose keys are tool names. `tool()` is a TypeScript helper: the reference says it has no runtime behavior and exists so `execute`’s argument type is inferred from `inputSchema`. The package function returns the object it was given. Sources: [Tool calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling) (opening example); [`tool()`](https://ai-sdk.dev/docs/reference/ai-sdk-core/tool); [`packages/provider-utils/src/types/tool.ts` on `main`](https://github.com/vercel/ai/blob/main/packages/provider-utils/src/types/tool.ts).

`inputSchema` is a Zod schema or a JSON schema. The model uses it to generate the tool input, and the SDK uses it to validate that input. A mismatch throws `InvalidToolInputError`; `generateText` throws that error out of the call. Zod v3 and v4 are accepted directly. Sources: [`generateText`](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text) (`inputSchema`, `stopWhen`); [Tool calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling), “Handling Errors”; [Tools](https://ai-sdk.dev/docs/foundations/tools), “Schemas”.

A step is one model generation plus execution of the local tools that generation requested. `stopWhen` is checked only when the last step contains tool results. The default is `isStepCount(1)`. After that first step, the condition is met, so the SDK does not start a second generation that would see the tool result. Setting `isStepCount(5)`, as in the multi-step example, is what allows further rounds. `maxSteps` is not a parameter on the current `generateText` reference. Sources: [Tool calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling), “Multi-Step Calls (using stopWhen)”; [`isStepCount`](https://ai-sdk.dev/docs/reference/ai-sdk-core/is-step-count); [`generateText`](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text) (`stopWhen` default `isStepCount(1)`).

`toolChoice` defaults to `"auto"`. `"required"` asks for a tool call. The Anthropic provider docs say `claude-sonnet-5-5`, `claude-opus-5-5`, and `claude-fable-5-1` downgrade a required or named `toolChoice` to `auto`. They do not list `claude-haiku-5-5` in that sentence. Source: [AI SDK Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic), “Structured Outputs and Tool Input Streaming”; [`generateText`](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text) (`toolChoice`).

## Zod and the tool result

`outputSchema` is the slot for a Zod schema of the value `execute` returns. The `tool()` reference says it is “used for type inference.” The package comment says that if it is omitted, the output type is inferred from `execute`. The `tool()` helper does not parse that schema. A runtime check of the value the tool returns is `schema.parse(...)` on that value before `execute` returns it. Sources: [`tool()`](https://ai-sdk.dev/docs/reference/ai-sdk-core/tool) (`outputSchema`); [`packages/provider-utils/src/types/tool.ts` on `main`](https://github.com/vercel/ai/blob/main/packages/provider-utils/src/types/tool.ts).

The foundations page says schemas “define and validate the tool input, tool outputs, and structured output generation.” The specific `tool()` reference limits `outputSchema` to type inference and assigns validation of the model’s tool input to `inputSchema`. Source: [Tools](https://ai-sdk.dev/docs/foundations/tools), “Schemas”.

`outputSchema` is not sent to the model. Source: maintainer reply on [vercel/ai#10222](https://github.com/vercel/ai/issues/10222).

## `ANTHROPIC_API_KEY` and `runtimeConfig`

`createAnthropic` takes `apiKey`. The provider sends it as the `x-api-key` header. If omitted, it defaults to the `ANTHROPIC_API_KEY` environment variable. Source: [AI SDK Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic), “Provider Instance” (`apiKey`).

Nuxt’s private runtime config is any key **not** under `public`. The client receives `runtimeConfig.public` and `runtimeConfig.app` only. The server sees the whole object, read-only. Do not render a private key or put it in `useState`, or it ships to the client. In a server route, `useRuntimeConfig(event)` is the documented call; passing `event` is how the route sees environment overrides applied at runtime. Sources: [Runtime Config](https://nuxt.com/docs/4.x/guide/going-further/runtime-config), “Exposing”, “Environment Variables”, “Server Routes”, and the client/server warning.

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    anthropicApiKey: '',
  },
})
```

Nuxt only overrides a runtime config property from an uppercase env var that starts with `NUXT_` and uses `_` at case changes. For `anthropicApiKey`, that variable is `NUXT_ANTHROPIC_API_KEY`. A variable that does not start with `NUXT_` is not applied to `runtimeConfig` in production. Source: [Runtime Config](https://nuxt.com/docs/4.x/guide/going-further/runtime-config), “Environment Variables”; [`.env`](https://nuxt.com/docs/4.x/directory-structure/env), “Production”.

`ANTHROPIC_API_KEY` still matters, in two documented places:

- The Nuxt CLI loads `.env` at dev, build, and generate time, and those variables are visible in `nuxt.config`. Assigning `anthropicApiKey: process.env.ANTHROPIC_API_KEY` therefore captures that name when the config is evaluated. The runtime-config page says a default taken from a differently named env var works at build time and breaks at runtime: the built server does not re-read it. `.env` is not loaded when you start the built server with `node .output/server/index.mjs`. `nuxt preview` does load `.env` into `process.env`, which still does not rename it into a `NUXT_` override.
- If the route omits `apiKey`, `@ai-sdk/anthropic` reads `process.env.ANTHROPIC_API_KEY` itself. That is the provider default, not Nuxt `runtimeConfig`.

Sources: [`.env`](https://nuxt.com/docs/4.x/directory-structure/env); [Runtime Config](https://nuxt.com/docs/4.x/guide/going-further/runtime-config), the warning under “Environment Variables”; [AI SDK Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic), `apiKey`.

For a route that must read the key from `runtimeConfig`:

```ts
export default defineEventHandler(async (event) => {
  const { anthropicApiKey } = useRuntimeConfig(event)
  const anthropic = createAnthropic({ apiKey: anthropicApiKey })
  // generateText({ model: anthropic('claude-haiku-5-5'), ... })
})
```

Set `NUXT_ANTHROPIC_API_KEY` in the environment of a built server. Setting only `ANTHROPIC_API_KEY` there updates `process.env` and the provider default, and does not update `runtimeConfig`. Keep the key out of `runtimeConfig.public`. Add `.env` to `.gitignore`. Source: [`.env`](https://nuxt.com/docs/4.x/directory-structure/env).

## Shape the page reads

`generateText` returns `toolResults` (every step) and `staticToolResults` (static tools, every step). `steps` is one entry per step; `finalStep` is `steps.at(-1)`. `text` is the text of the **final** step, or `''` when that step has no text parts. With the default one-step stop, a tool call can finish the step before any follow-up sentence exists, so the chart data is the tool result, not `text`. Sources: [`generateText`](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text), “Returns”; [Tool calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling), “Steps”.

On `main`, a static tool result is:

```ts
{
  type: 'tool-result'
  toolCallId: string
  toolName: string // the key in `tools`, typed to that key
  input: /* parsed tool input, typed from inputSchema */
  output: /* value returned by execute, typed from outputSchema or execute */
  providerExecuted?: boolean
  providerMetadata?: ProviderMetadata
  toolMetadata?: JSONObject
  dynamic?: false | undefined
  preliminary?: boolean
  title?: string
}
```

`result.toolResults` is that object or a dynamic variant (`dynamic: true`, `input` and `output` typed `unknown`). A tool defined with `tool()` is the static variant, so the page reads `result.staticToolResults` (or `result.finalStep.staticToolResults`, the same single step). `output` is the `execute` return value, not a `{ type: 'json', value }` wrapper. Source: [`packages/ai/src/generate-text/tool-result.ts` on `main`](https://github.com/vercel/ai/blob/main/packages/ai/src/generate-text/tool-result.ts).

The `{ type, value }` wrapper is a different type. `ToolResultPart` on a `ModelMessage` stores `output` as `ToolResultOutput` (`type: 'text' | 'json' | 'error-text' | 'error-json' | ...`). That is the message you would send back to a model, not the field on `result.staticToolResults`. Source: [`ModelMessage`](https://ai-sdk.dev/docs/reference/ai-sdk-core/model-message), `ToolResultPart` and `ToolResultOutput`.

A thrown `execute` does not reject `generateText`. It becomes a `tool-error` part on `result.steps[].content` (`error`, `toolName`, `input`). Schema failures on the model’s tool input do reject the call (`InvalidToolInputError`). Source: [Tool calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling), “Handling Errors”.

## Sources

- [AI SDK Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic)
- [Tool calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [`generateText`](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text)
- [`isStepCount`](https://ai-sdk.dev/docs/reference/ai-sdk-core/is-step-count)
- [`tool()`](https://ai-sdk.dev/docs/reference/ai-sdk-core/tool)
- [Tools](https://ai-sdk.dev/docs/foundations/tools)
- [`ModelMessage`](https://ai-sdk.dev/docs/reference/ai-sdk-core/model-message)
- [`packages/ai/src/generate-text/tool-result.ts`](https://github.com/vercel/ai/blob/main/packages/ai/src/generate-text/tool-result.ts)
- [`packages/provider-utils/src/types/tool.ts`](https://github.com/vercel/ai/blob/main/packages/provider-utils/src/types/tool.ts)
- [vercel/ai#10222](https://github.com/vercel/ai/issues/10222)
- [Anthropic models overview](https://docs.anthropic.com/en/docs/about-claude/models/overview)
- [Anthropic pricing](https://docs.anthropic.com/en/docs/about-claude/pricing)
- [Nuxt runtime config](https://nuxt.com/docs/4.x/guide/going-further/runtime-config)
- [Nuxt `.env`](https://nuxt.com/docs/4.x/directory-structure/env)
