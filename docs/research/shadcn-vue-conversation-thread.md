# Which shadcn-vue pieces a Conversation thread installs

Research for [issue 19](https://github.com/TboCht/Weather_data_LLM/issues/19). Sources checked 2026-10-27 against shadcn-vue `dev` at [`de1f76cbb4b319ea26b0dea175dc00c18fce3bd0`](https://github.com/unovue/shadcn-vue/commit/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0) and the live registry at `https://shadcn-vue.com/r/styles/{style}/{name}.json`. For the items below, the live JSON matched that commit. Nothing here was installed. `shadcn-vue add` was not run.

## Answer

There is still no registry item named `chat`, `conversation`, or `prompt-input`. The earlier note on `research/nuxt-tailwind-shadcn` is right about that, and right that the Chat page's install command is `message-scroller`, `message`, `bubble`, and `input-group`.

That command is not the whole smaller page. A page that is only a message list, a scroller, bubbles, a prompt, and an empty thread names five items:

```bash
npx shadcn-vue@latest add message message-scroller bubble input-group empty
```

`empty` is the empty thread. The Chat demo renders it. The Chat install command does not add it.

Those five pull three more registry items, and no further ones: `button` (from `message-scroller` and from `input-group`), plus `input` and `textarea` (from `input-group`). None of these items has a `peerDependencies` field. The npm packages named in their `dependencies` arrays are `reka-ui`, `cn`, and `@vueuse/core`.

The Chat doc's full demo imports more than that page uses. Leave out `Markdown`, `Button` (the reset control), `CodeBlock`, `DropdownMenu`, `Tooltip`, `Trace`, the icons that exist only for those, `createReusableTemplate`, `promiseTimeout`, `tryOnScopeDispose`, and `reactive`.

Two nearby install lines add items this page does not need. The [Prompt Input](https://www.shadcn-vue.com/docs/ai-elements/prompt-input) CLI adds `attachment` and `dropdown-menu`. The [AI Elements Message](https://www.shadcn-vue.com/docs/ai-elements/message) CLI adds `tooltip`. The Usage example on each of those pages does not render the extra piece.

## Earlier finding

Confirmed, from today's Chat doc:

- No item named `chat`. AI Elements are patterns you copy. "There is no package to install." Source: [`apps/v4/content/docs/ai-elements.md`](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/content/docs/ai-elements.md) line 6, published at [AI Elements](https://www.shadcn-vue.com/docs/ai-elements).
- The Chat install command is `npx shadcn-vue@latest add message-scroller message bubble input-group`. Source: [`chat.md` line 39](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/content/docs/ai-elements/chat.md#L39), published at [Chat](https://www.shadcn-vue.com/docs/ai-elements/chat). The same page's manual tab adds `message bubble input-group` and then copies the message-scroller source by hand ([line 51](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/content/docs/ai-elements/chat.md#L51)).

Corrected for this page: that command does not install the empty thread. The published `reka-vega` catalog (`name`: `shadcn-vue`, 70 items) has `message`, `message-scroller`, `bubble`, `input-group`, and `empty`. It has no `chat`, `conversation`, or `prompt-input`. Source: [`apps/v4/public/r/styles/reka-vega/registry.json`](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/public/r/styles/reka-vega/registry.json). `chat.json` on that style and on `new-york-v4` is a 404. The official registry URL is `https://shadcn-vue.com/r/styles/{style}/{name}.json`. Source: [`apps/v4/registry/registries.ts`](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/registry/registries.ts) (`@shadcn`).

## The five items

| Piece on the page | Registry item | Doc that names the install |
| --- | --- | --- |
| Message list | `message` | [Message](https://www.shadcn-vue.com/docs/components/message) (`npx shadcn-vue@latest add message`, [`message.md` line 37](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/content/docs/components/message.md#L37)). Also in the Chat command. |
| Scroller | `message-scroller` | [Message Scroller](https://www.shadcn-vue.com/docs/components/message-scroller) and the Chat command. |
| Bubbles | `bubble` | [Bubble](https://www.shadcn-vue.com/docs/components/bubble) and the Chat command. `message` does not pull `bubble`. |
| Prompt | `input-group` | Chat line 20: the thread "is built with" Message Scroller, Message, Bubble, and Input Group. Chat line 16 calls the field a Prompt Input. The Prompt Input Usage example is an `InputGroup` with `InputGroupTextarea` and two `InputGroupButton`s ([`prompt-input.md` lines 68–117](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/content/docs/ai-elements/prompt-input.md#L68)). |
| Empty thread | `empty` | [Empty](https://www.shadcn-vue.com/docs/components/empty) (`npx shadcn-vue@latest add empty`, [`empty.md` line 33](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/content/docs/components/empty.md#L33)). The Chat demo renders `Empty` when `messages.length === 0`. |

`message` does not declare `bubble` or `avatar` as registry dependencies. `MessageAvatar.vue` is a file inside the `message` item; it uses `Primitive` from `reka-ui`, not the `avatar` item. Source: [`_registry.ts` lines 1498–1503](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/registry/bases/reka/ui/_registry.ts#L1498) and [`MessageAvatar.vue`](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/registry/bases/reka/ui/message/MessageAvatar.vue).

## What those items pull

`add` walks `registryDependencies` recursively and npm-installs each item's `dependencies`. Source: [`packages/cli/src/registry/resolver.ts`](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/packages/cli/src/registry/resolver.ts) (`resolveDependenciesRecursively`) and [`packages/cli/src/utils/updaters/update-dependencies.ts`](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/packages/cli/src/utils/updaters/update-dependencies.ts) (`addDependency`). There is no `peerDependencies` key on these payloads.

The arrays are the same on `reka-vega` and on `new-york-v4` (the CLI fallback style, [`FALLBACK_STYLE`](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/packages/cli/src/registry/constants.ts#L10)). Live JSON checked 2026-10-27. The reka source of the same arrays is [`_registry.ts`](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/registry/bases/reka/ui/_registry.ts).

| Item | `registryDependencies` | `dependencies` | Source lines |
| --- | --- | --- | --- |
| `message` | none | `reka-ui`, `cn` | [1498–1503](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/registry/bases/reka/ui/_registry.ts#L1498) |
| `message-scroller` | `button` | `cn` | [1536–1543](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/registry/bases/reka/ui/_registry.ts#L1536) |
| `bubble` | none | `reka-ui`, `cn` | [293–298](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/registry/bases/reka/ui/_registry.ts#L293) |
| `input-group` | `button`, `input`, `textarea` | `cn` | [1226–1235](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/registry/bases/reka/ui/_registry.ts#L1226) |
| `empty` | none | `cn` | [1039–1043](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/registry/bases/reka/ui/_registry.ts#L1039) |
| `button` | none | `reka-ui`, `cn` | [323–328](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/registry/bases/reka/ui/_registry.ts#L323) |
| `input` | none | `@vueuse/core`, `cn` | [1208–1213](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/registry/bases/reka/ui/_registry.ts#L1208) |
| `textarea` | none | `@vueuse/core`, `cn` | [2561–2566](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/registry/bases/reka/ui/_registry.ts#L2561) |

Live payloads: [`reka-vega/message.json`](https://shadcn-vue.com/r/styles/reka-vega/message.json), [`message-scroller.json`](https://shadcn-vue.com/r/styles/reka-vega/message-scroller.json), [`bubble.json`](https://shadcn-vue.com/r/styles/reka-vega/bubble.json), [`input-group.json`](https://shadcn-vue.com/r/styles/reka-vega/input-group.json), [`empty.json`](https://shadcn-vue.com/r/styles/reka-vega/empty.json), [`button.json`](https://shadcn-vue.com/r/styles/reka-vega/button.json), [`input.json`](https://shadcn-vue.com/r/styles/reka-vega/input.json), [`textarea.json`](https://shadcn-vue.com/r/styles/reka-vega/textarea.json). The same eight paths under [`/r/styles/new-york-v4/`](https://shadcn-vue.com/r/styles/new-york-v4/message.json) carry the same two arrays.

`cn` in those arrays is the npm package. The component files import it with `import { cn } from "cn"`. The style `utils` item re-exports that package. Source: [`Button.vue`](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/registry/bases/reka/ui/button/Button.vue) and [`lib/utils.ts`](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/registry/bases/reka/lib/utils.ts). The registry does not pin a version.

`button`, `input`, and `textarea` declare no further registry items, so the walk stops there.

`MessageScrollerButton.vue` imports `Button` and `ArrowDownIcon` from `@lucide/vue`. `InputGroupButton.vue` imports `Button`. `bubble/index.ts`, `empty/index.ts`, `input-group/index.ts`, and `button/index.ts` import `class-variance-authority`. Those two packages are not in the eight items' `dependencies`. They are on the style `index` item (`registry:style`): `reka-vega` lists `class-variance-authority` and `@lucide/vue`; `new-york-v4` lists those plus `cn`. Both list devDependency `tw-animate-css` and registry dependency `utils`. Source: [`reka-vega/index.json`](https://shadcn-vue.com/r/styles/reka-vega/index.json), [`new-york-v4/index.json`](https://shadcn-vue.com/r/styles/new-york-v4/index.json). That item is the style init installs, not something these five pull.

## Install lines that are wider than this page

Prompt Input's CLI is `npx shadcn-vue@latest add input-group attachment dropdown-menu` ([`prompt-input.md` line 39](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/content/docs/ai-elements/prompt-input.md#L39)). Its Usage example does not import `Attachment` or `DropdownMenu`. Attachments and the model menus are later sections of that page. This page's prompt is the Input Group field, so it does not add `attachment` or `dropdown-menu`.

If a later `add` does include them, the live payloads are:

| Item | `reka-vega` | `new-york-v4` |
| --- | --- | --- |
| `attachment` | `dependencies`: `cn`, `reka-ui`. `registryDependencies`: `button`. [`attachment.json`](https://shadcn-vue.com/r/styles/reka-vega/attachment.json) | `dependencies`: `cn`, `reka-ui`. No `registryDependencies`. [`attachment.json`](https://shadcn-vue.com/r/styles/new-york-v4/attachment.json) |
| `dropdown-menu` | `dependencies`: `reka-ui`, `@vueuse/core`, `cn`. No `registryDependencies`. Same on both styles. [`dropdown-menu.json`](https://shadcn-vue.com/r/styles/reka-vega/dropdown-menu.json) | same |

The AI Elements Message pattern is `npx shadcn-vue@latest add message bubble tooltip` ([`message.md` line 39](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/content/docs/ai-elements/message.md#L39)). Its Usage example is `Message`, `Bubble`, and a `Button` in `MessageFooter`. It does not import `Tooltip`. The Actions section is where tooltips are described. `tooltip` has `dependencies` `reka-ui`, `@vueuse/core`, `cn`, and no `registryDependencies` ([`tooltip.json`](https://shadcn-vue.com/r/styles/reka-vega/tooltip.json)). The Chat thread command does not add it.

## Imports in the Chat demo this page does not use

The demo source is [`ChatDemo.vue`](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/components/demo/ChatDemo.vue) lines 2–62. The published Chat page shows the same symbols with `@/registry/bases/reka/ui/...` rewritten to `@/components/ui/...`.

Kept for a message list, a scroller, bubbles, the Input Group prompt, and the empty thread:

- `Bubble`, `BubbleContent`
- `Empty`, `EmptyDescription`, `EmptyHeader`, `EmptyMedia`, `EmptyTitle`
- `InputGroup`, `InputGroupAddon`, `InputGroupButton`, `InputGroupTextarea`
- `Message`, `MessageContent`
- `MessageScroller`, `MessageScrollerButton`, `MessageScrollerContent`, `MessageScrollerItem`, `MessageScrollerProvider`, `MessageScrollerViewport`
- `ArrowUpIcon` (the send button)
- `MessageCircleDashedIcon` (the demo's empty media; the `empty` item does not depend on that icon)
- `computed`, `ref` from `vue` (the demo's list and draft)

Not used by those pieces:

| Import | Where the demo uses it |
| --- | --- |
| `Markdown` from `@/components/Markdown.vue` | The assistant reply. The Chat Markdown section tells you to render with `Markdown` from `@comark/vue`, which is also not one of these registry items ([`chat.md` Markdown](https://github.com/unovue/shadcn-vue/blob/de1f76cbb4b319ea26b0dea175dc00c18fce3bd0/apps/v4/content/docs/ai-elements/chat.md)). |
| `Button` | The reset control in the header. The `button` item is still installed, because `message-scroller` and `input-group` pull it. `InputGroupButton` is a different export and stays. |
| `CodeBlock`, `CodeBlockContent` | Tool stdout. Registry item `code-block` ([`code-block.json`](https://shadcn-vue.com/r/styles/reka-vega/code-block.json): dependencies `cn`, `reka-ui`, `@vueuse/core`, `shiki`; registry dependency `button`). The Chat command does not add it. |
| `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuTrigger` | The prompt's "add context" menu (photos, deep research, web search). |
| `Tooltip`, `TooltipContent`, `TooltipTrigger` | The reset button's tooltip. |
| `Trace`, `TraceCollapsible`, `TraceCollapsibleContent`, `TraceCollapsibleTrigger`, `TraceIcon`, `TraceLine`, `TraceTitle` | The scripted reasoning and tool rows. Registry item `trace` ([`trace.json`](https://shadcn-vue.com/r/styles/reka-vega/trace.json): dependencies `cn`, `reka-ui`, `@vueuse/core`; registry dependency `collapsible`). |
| `CircleCheckIcon`, `LoaderCircleIcon`, `TerminalIcon` | Those Trace rows. |
| `RotateCwIcon` | Reset. |
| `PlusIcon`, `PaperclipIcon`, `TelescopeIcon`, `GlobeIcon` | The dropdown menu. |
| `createReusableTemplate`, `promiseTimeout`, `tryOnScopeDispose` from `@vueuse/core` | The reusable tool/reasoning rows and the scripted stream. |
| `reactive` from `vue` | `reasoningOpen`, the open state of those reasoning rows. |
