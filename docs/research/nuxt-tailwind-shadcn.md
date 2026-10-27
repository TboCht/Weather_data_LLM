# How Nuxt 4, TypeScript strict, Tailwind, and shadcn-vue install together

Research for [issue 2](https://github.com/TboCht/Weather_data_LLM/issues/2). Sources checked 2026-10-27. Each claim is tied to a primary doc or the package repo that owns it. Nothing here was installed.

## Answer

Create the app with npm as `npm create nuxt@latest <project-name>`. For a non-interactive Nuxt 4 app, pass template `minimal` (the starter registry’s default, labeled “Nuxt 4”; it unpacks the `v4` branch, whose `package.json` depends on `nuxt` `^4.6.2`).

Nuxt’s `typescript.strict` defaults to `true` and writes TypeScript `compilerOptions.strict`. That turns on `noImplicitAny`, which reports an **implied** `any`. It does not reject an explicit `any` annotation. The mechanism that does is the ESLint rule `@typescript-eslint/no-explicit-any` at `"error"`, which `@nuxt/eslint` applies from typescript-eslint’s `flat/recommended` config once the `typescript` package is installed.

shadcn-vue’s current Nuxt install doc does not print a Tailwind major. Its default integration is the Vite plugin `@tailwindcss/vite` plus unpinned `tailwindcss`, with CSS `@import "tailwindcss"`. The other tab is the Nuxt module `@nuxtjs/tailwindcss` pinned to `7.0.0-beta.1`. That module’s own repo says the v7 line is for Tailwind CSS 4 and depends on `tailwindcss` `^4.1.12`. So the major those steps are written for is **4**.

shadcn-vue init for Nuxt, with npm: install Tailwind, `npx nuxi@latest module add shadcn-nuxt`, set `modules` and `shadcn` in `nuxt.config.ts`, `npx nuxi prepare`, `npx shadcn-vue@latest init`, then `npx shadcn-vue@latest add <name>`.

**AI or chat component in the official registry: no.** There is no item named `ai` or `chat`. The Chat page is a pattern. Its CLI step adds official registry items `message-scroller`, `message`, `bubble`, and `input-group`.

The shadcn Nuxt page does not state a Nuxt 4 version range. The only Nuxt semver in that page is `>=3.17.0`, inside the manual module sample. The Tailwind module version it pins depends on `@nuxt/kit` `^4.1.0`.

## Create a Nuxt 4 app with npm

Nuxt 4’s installation page says Node.js `22.x` or newer, and:

```bash
npm create nuxt@latest <project-name>
```

Source: [Installation (Nuxt 4.x)](https://nuxt.com/docs/4.x/getting-started/installation).

`create-nuxt` asks for a template, modules, and a package manager. `nuxt init` was removed from `@nuxt/cli`. Without a terminal, the command requires the directory, `--template`, `--packageManager`, and a git-init flag; anything missing exits with code `2`. npm needs `--` before those flags, or npm treats them as its own config. The documented non-interactive example is:

```bash
npm create nuxt@latest my-app -- --template minimal --packageManager pnpm --no-gitInit
```

Source: [create nuxt](https://nuxt.com/docs/4.x/api/commands/init). The same page says the default registry is loaded from `nuxt/starter/templates`.

The registry entry that is the default is `minimal`:

- `name`: `minimal`
- `label`: `Nuxt 4`
- `default`: `true`
- `tar` / `branch`: the `v4` branch of `nuxt/starter`

Source: [`templates/minimal.json` on `nuxt/starter` branch `templates`](https://github.com/nuxt/starter/blob/templates/templates/minimal.json).

The template named `v4` is `"deprecated": true` (“Minimal setup for Nuxt 4”) and points at the same `v4` branch. `v3` is also deprecated. Source: [`templates/v4.json`](https://github.com/nuxt/starter/blob/templates/templates/v4.json), [`templates/v3.json`](https://github.com/nuxt/starter/blob/templates/templates/v3.json).

The `v4` branch `package.json` depends on `"nuxt": "^4.6.2"`. Source: [`package.json` on branch `v4`](https://github.com/nuxt/starter/blob/v4/package.json).

npm, non-interactive, selecting that default template:

```bash
npm create nuxt@latest <project-name> -- --template minimal --packageManager npm --gitInit
```

(`--no-gitInit` is the other git flag the init docs list. The example above uses `--gitInit` so the flag is present.)

The starter README on branch `templates` still shows `npm create nuxt@latest my-app -- -t v4` as the Nuxt 4 example, and lists an unflagged `npm create nuxt@latest` in the Nuxt 3 row. Source: [`README.md` on branch `templates`](https://github.com/nuxt/starter/blob/templates/README.md). That table does not match the registry JSON the init command loads: `minimal` is the default labeled Nuxt 4, and the template name `v4` is deprecated. Use `minimal`.

## TypeScript settings, and what actually rejects `any`

### What Nuxt turns on

Nuxt’s schema defaults are `typescript.strict: true` and `typescript.typeCheck: false`. Source: [`packages/schema/src/config/typescript.ts`](https://github.com/nuxt/nuxt/blob/main/packages/schema/src/config/typescript.ts). The config reference documents the same defaults. Source: [`typescript` in the Nuxt 4 config reference](https://nuxt.com/docs/4.x/api/nuxt-config#typescript).

When Nuxt generates the tsconfig, it sets:

- `strict: nuxt.options.typescript?.strict ?? true`
- `noUncheckedIndexedAccess: true`
- `noImplicitOverride: true`
- `noImplicitThis: true`

Source: [`packages/kit/src/template.ts`](https://github.com/nuxt/nuxt/blob/main/packages/kit/src/template.ts) (the `strict` assignment is the line `strict: nuxt.options.typescript?.strict ?? true`).

Extend shared compiler options with `typescript.tsConfig`. Per-context overrides are `typescript.appTsConfig`, `serverTsConfig`, `nodeTsConfig`, and `sharedTsConfig`. Do not hand-edit the generated `.nuxt/tsconfig.*.json` files. Source: [tsconfig.json](https://nuxt.com/docs/4.x/directory-structure/tsconfig).

`nuxt dev` and `nuxt build` do not typecheck unless you opt in. Install `vue-tsc` and `typescript`, then either run `npx nuxt typecheck` or set `typescript.typeCheck: true`. Source: [TypeScript](https://nuxt.com/docs/4.x/guide/concepts/typescript). That page also says strict checks are enabled by default when `typescript.typeCheck` is enabled, and shows turning them off with `typescript.strict: false`.

### `strict` does not reject explicit `any`

TypeScript’s `strict` flag enables the strict-mode family. `--noImplicitAny` is `true` if `strict` is on. Its handbook description is error reporting for expressions and declarations with an **implied** `any` type. Source: [tsc CLI options](https://www.typescriptlang.org/docs/handbook/compiler-options.html) (`--noImplicitAny`), and [noImplicitAny](https://www.typescriptlang.org/tsconfig/noImplicitAny.html).

typescript-eslint states the gap directly: “TypeScript's `--noImplicitAny` compiler option prevents an implied `any`, but doesn't prevent `any` from being explicitly used the way this rule does.” The rule is `@typescript-eslint/no-explicit-any` (“Disallow the `any` type”). Extending `plugin:@typescript-eslint/recommended` enables it. Source: [no-explicit-any](https://typescript-eslint.io/rules/no-explicit-any).

In the generated flat recommended config the rule is `'@typescript-eslint/no-explicit-any': 'error'`. Source: [`packages/eslint-plugin/src/configs/flat/recommended.ts`](https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/src/configs/flat/recommended.ts).

### Nuxt’s ESLint setup applies that rule

Nuxt’s code-style page says to add ESLint with:

```bash
npx nuxt module add eslint
```

Source: [Code Style](https://nuxt.com/docs/4.x/guide/concepts/code-style).

The module docs give the same command as `npx nuxi module add eslint`, and the npm manual install:

```bash
npm install -D @nuxt/eslint eslint typescript
```

If you use TypeScript, install the `typescript` package (`npm install -D typescript`). Source: [ESLint module docs](https://github.com/nuxt/eslint/blob/main/docs/content/1.packages/0.module.md) (published at [eslint.nuxt.com/packages/module](https://eslint.nuxt.com/packages/module)). Those docs also say that by default the module installs the JS, TS, and Vue plugins with their recommended rules.

`@nuxt/eslint-config` sets `features.typescript` to `isPackageExists('typescript')`. Source: [`packages/eslint-config/src/utils.ts`](https://github.com/nuxt/eslint/blob/main/packages/eslint-config/src/utils.ts). When that feature is not `false`, the config spreads `pluginTs.configs['flat/recommended']`, which is the config that sets `@typescript-eslint/no-explicit-any` to `'error'`. Source: [`packages/eslint-config/src/configs/typescript.ts`](https://github.com/nuxt/eslint/blob/main/packages/eslint-config/src/configs/typescript.ts).

A separate option, `features.typescript.strict`, defaults to `true` and additionally spreads typescript-eslint’s `flat/strict` (or the type-checked strict preset when `tsconfigPath` is set). Source: the same `typescript.ts`, and the JSDoc on `NuxtESLintFeaturesOptions.typescript.strict` in [`packages/eslint-config/src/types.ts`](https://github.com/nuxt/eslint/blob/main/packages/eslint-config/src/types.ts) (`@default true`, linking to [typescript-eslint strict](https://typescript-eslint.io/users/configs#strict)). That strict preset is extra rules. Explicit `any` is already an error from `flat/recommended`, including when `features.typescript.strict` is `false`.

So the keys are:

| Key | What it does to `any` |
| --- | --- |
| `typescript.strict` (Nuxt, default `true`) | Sets `compilerOptions.strict`, which includes `noImplicitAny`. Implied `any` only. |
| `typescript.typeCheck` (default `false`) | Runs that checker at dev/build. Still not explicit `any`. |
| `@typescript-eslint/no-explicit-any` | Rejects an explicit `any`. `'error'` via `@nuxt/eslint` once `typescript` is installed. |

## Tailwind major and the Nuxt integration shadcn-vue documents

Current Nuxt page: [shadcn-vue.com/docs/installation/nuxt](https://www.shadcn-vue.com/docs/installation/nuxt). Source file on the default branch `dev`: [`apps/v4/content/docs/installation/02.nuxt.md`](https://github.com/unovue/shadcn-vue/blob/dev/apps/v4/content/docs/installation/02.nuxt.md). The repo homepage is `https://shadcn-vue.com`. The commands below are the npm blocks in that file. The page does not contain the words “Tailwind v4” or “Nuxt 4”.

The Tailwind section is two tabs. The default tab value is `vite`.

**Default: `@tailwindcss/vite`**

```bash
npm install tailwindcss @tailwindcss/vite -D
```

`app/assets/css/tailwind.css`:

```css
@import "tailwindcss";
```

```ts
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  // ...
  css: ['~/assets/css/tailwind.css'],
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})
```

**Other tab: Nuxt module `@nuxtjs/tailwindcss`**

```bash
npm install tailwindcss @nuxtjs/tailwindcss@7.0.0-beta.1 -D
```

Same `app/assets/css/tailwind.css` (`@import "tailwindcss"`).

```ts
export default defineNuxtConfig({
  // ...
  modules: ['@nuxtjs/tailwindcss'],
})
```

Why this is Tailwind CSS 4, even though the shadcn page does not say so:

- `@nuxtjs/tailwindcss` on `main` is version `7.0.0-beta.1`, the version the shadcn page pins. Its README says: “You’re viewing the **v7** branch for compatibility with Tailwind CSS 4.” The stable line that uses Tailwind CSS 3 is v6. Source: [`README.md` on `nuxt-modules/tailwindcss` `main`](https://github.com/nuxt-modules/tailwindcss/blob/main/README.md).
- That same `package.json` depends on `tailwindcss` `^4.1.12`, `@tailwindcss/vite` `^4.1.12`, `@tailwindcss/postcss` `^4.1.12`, and `@nuxt/kit` `^4.1.0`. Source: [`package.json`](https://github.com/nuxt-modules/tailwindcss/blob/main/package.json).
- The `tailwindcss` package on `tailwindlabs/tailwindcss` `main` is version `4.3.3`. Source: [`packages/tailwindcss/package.json`](https://github.com/tailwindlabs/tailwindcss/blob/main/packages/tailwindcss/package.json).
- Tailwind’s own Nuxt guide installs `tailwindcss` and `@tailwindcss/vite`, registers `tailwindcss()` on `vite.plugins`, and uses `@import "tailwindcss"` in `./app/assets/css/main.css` (shadcn uses `tailwind.css` instead of `main.css`). Source: [Install Tailwind CSS with Nuxt](https://tailwindcss.com/docs/installation/framework-guides/nuxt).

The shadcn page does not pin the `tailwindcss` package version. It pins only `@nuxtjs/tailwindcss@7.0.0-beta.1` on the module tab.

## shadcn-vue init steps for Nuxt

From the same [`02.nuxt.md`](https://github.com/unovue/shadcn-vue/blob/dev/apps/v4/content/docs/installation/02.nuxt.md), after the Nuxt app exists. Order on the page:

1. Create the Nuxt project: `npm create nuxt@latest`. If you hit `ERROR: Cannot read properties of undefined (reading 'sys') (x4)`, the page says to run `npm install -D typescript`. It points at [nuxt/nuxt#20936](https://github.com/nuxt/nuxt/issues/20936) for that error.
2. Add Tailwind, using one of the two tabs above. The snippets use `// ...`, so later `nuxt.config.ts` blocks are meant to be merged with this one.
3. Add the Nuxt module. Skipping it “triggers numerous console warnings due to Nuxt's auto-import feature.” Default tab:

   ```bash
   npx nuxi@latest module add shadcn-nuxt
   ```

   The manual tab instead installs `@types/node` and pastes a local `modules/shadcn.ts`. That sample’s module meta includes `compatibility: { nuxt: '>=3.17.0' }`.
4. Configure `nuxt.config.ts`:

   ```ts
   export default defineNuxtConfig({
     // ...
     modules: ['shadcn-nuxt'],
     shadcn: {
       /**
        * Prefix for all the imported component.
        * @default "Ui"
        */
       prefix: '',
       /**
        * Directory that the component lives in.
        * Will respect the Nuxt aliases.
        * @link https://nuxt.com/docs/api/nuxt-config#alias
        * @default "@/components/ui"
        */
       componentDir: '@/components/ui'
     }
   })
   ```

   Keys: `modules` includes `'shadcn-nuxt'`; `shadcn.prefix` is `''` in the sample (the comment says the default is `"Ui"`); `shadcn.componentDir` is `'@/components/ui'` (the comment says the default is `"@/components/ui"`).
5. Optional. `app/plugins/ssr-width.ts` calls `provideSSRWidth(1024, nuxtApp.vueApp)` from `@vueuse/core`. The page does not show an install command for `@vueuse/core`. It links to [useSSRWidth](https://vueuse.org/core/useSSRWidth/).
6. `npx nuxi prepare` so a new project gets a `.nuxt` directory.
7. `npx shadcn-vue@latest init`. The page shows one prompt: `Which color would you like to use as base color? › Neutral`.
8. Add a component, for example `npx shadcn-vue@latest add button`. Nuxt auto-import supplies `Button`; the sample is `pages/index.vue` with `<Button>Click me</Button>` and no import.

## Official registry: AI or chat component

**No.** The official registry is `@shadcn`, described as “The official shadcn-vue registry of components, blocks, and charts,” URL template `https://shadcn-vue.com/r/styles/{style}/{name}.json`. Source: [`apps/v4/registry/registries.ts`](https://github.com/unovue/shadcn-vue/blob/dev/apps/v4/registry/registries.ts).

The published `new-york-v4` catalog (`name`: `shadcn-vue`) has no item named `ai` or `chat`. It does have these `registry:ui` items: `message`, `bubble`, `message-scroller`, `input-group`. Source: [`apps/v4/public/r/styles/new-york-v4/registry.json`](https://github.com/unovue/shadcn-vue/blob/dev/apps/v4/public/r/styles/new-york-v4/registry.json).

[AI Elements](https://www.shadcn-vue.com/docs/ai-elements) says the patterns are compositions you copy, and “There is no package to install.” Chat is one of those patterns, not a registry item. Source: [`apps/v4/content/docs/ai-elements.md`](https://github.com/unovue/shadcn-vue/blob/dev/apps/v4/content/docs/ai-elements.md).

The Chat page’s CLI install is:

```bash
npx shadcn-vue@latest add message-scroller message bubble input-group
```

Source: [`apps/v4/content/docs/ai-elements/chat.md`](https://github.com/unovue/shadcn-vue/blob/dev/apps/v4/content/docs/ai-elements/chat.md).

`@ai-elements` (`https://registry.ai-elements-vue.com/{name}.json`, author `vuepont`) is a separate built-in registry in the same `registries.ts`. The directory page calls those registries community registries maintained by third parties. Source: [`apps/v4/content/docs/directory/index.md`](https://github.com/unovue/shadcn-vue/blob/dev/apps/v4/content/docs/directory/index.md). That is not the official `@shadcn` registry.

## Version constraints relative to Nuxt 4

Stated on the shadcn Nuxt install page:

- No sentence that says Nuxt 4, and no Nuxt 4 semver range.
- CSS and the optional plugin live at `app/assets/css/tailwind.css` and `app/plugins/ssr-width.ts`. Nuxt 4’s upgrade guide is the doc that introduces the `app/` directory and moving `assets/` under it. Source: [Upgrade Guide](https://nuxt.com/docs/4.x/getting-started/upgrade).
- The manual `modules/shadcn.ts` sample sets `compatibility.nuxt` to `'>=3.17.0'`. That is a Nuxt 3-and-up floor, not a Nuxt 4 pin. It is only in the manual tab.

Stated by the package the page pins, not by the shadcn prose: `@nuxtjs/tailwindcss@7.0.0-beta.1` depends on `@nuxt/kit` `^4.1.0` (Nuxt 4) and `tailwindcss` `^4.1.12`. Source: [`package.json`](https://github.com/nuxt-modules/tailwindcss/blob/main/package.json).

The Nuxt 4 starter itself depends on `nuxt` `^4.6.2`. Source: [`nuxt/starter` `v4` `package.json`](https://github.com/nuxt/starter/blob/v4/package.json). shadcn’s create step is only `npm create nuxt@latest`, which resolves through the starter registry above.
