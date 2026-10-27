# Nuxt Charts on Nuxt 4, for a 24-hour temperature series

Researched 2026-10-27 from the `nuxt-charts` package metadata and the `packages/nuxt-charts-next` tree in [dennisadriaans/vue-chrts](https://github.com/dennisadriaans/vue-chrts). Docs site pages at `nuxtcharts.com` did not return usable article text during this pass; the claims below are from the package repo, its playground, and the npm registry.

## Which package

npm name: `nuxt-charts`. Registry dist-tags on 2026-10-27 ([registry.npmjs.org/nuxt-charts](https://registry.npmjs.org/nuxt-charts)):

| tag | version | what it is |
|---|---|---|
| `latest` | 2.2.3 | Legacy Unovis / `vue-chrts` module. Description says to prefer v3. |
| `next` | 3.1.0 | Current v3 module (`vccs` engine). `publishConfig.tag` is `next`. |
| `beta` | 3.0.0-beta.4 | Older v3 beta. |

The v3 README install line is `pnpm add nuxt-charts@next`. This repo uses npm, so the same specifier is `npm install nuxt-charts@next`. Installing without `@next` resolves `latest`, which is the legacy 2.x module.

Source: [packages/nuxt-charts-next/README.md](https://github.com/dennisadriaans/vue-chrts/blob/main/packages/nuxt-charts-next/README.md), [packages/nuxt-charts-next/package.json](https://github.com/dennisadriaans/vue-chrts/blob/main/packages/nuxt-charts-next/package.json).

## Module registration and Nuxt version

```ts
export default defineNuxtConfig({
  modules: ["nuxt-charts"],
})
```

`defineNuxtModule` sets `meta.compatibility.nuxt` to `">=3"`. The module setup comment says Nuxt 4 / Vite 6 environment configs override `nuxt.options.vite.optimizeDeps`, and it registers `vccs` through the `vite:extendConfig` hook for that reason. The package's own devDependency is `nuxt` `^4.3.0`.

There is no peer dependency field on the published 3.1.0 manifest.

Source: [src/module.ts](https://github.com/dennisadriaans/vue-chrts/blob/main/packages/nuxt-charts-next/src/module.ts), [package.json](https://github.com/dennisadriaans/vue-chrts/blob/main/packages/nuxt-charts-next/package.json).

## One numeric series over 24 hours

`LineChart` takes row objects, not a pair of parallel label/value arrays. For one temperature series the row is a label field plus one numeric field:

```ts
type HourPoint = { hour: string; temperature: number }

const categories = {
  temperature: { name: "Temperature", color: "#2662d9" },
}
```

```vue
<LineChart
  :data="hours"
  :categories="categories"
  :height="320"
  x-axis="hour"
/>
```

`hours` is `HourPoint[]` of length 24. `x-axis` is the key used as the category axis (`xAxis?: keyof T`). `categories` keys are the numeric series keys. `height` is required on the shared cartesian props.

The playground line page uses the same shape: `monthly` is `{ month, desktop, mobile }[]`, and a single series passes `categories` with one key and `x-axis="month"`.

Relevant props already on `LineChartProps` (it omits area-only fill props from `AreaChartProps`, which extends `CartesianChartBaseProps`):

- `data: T[]`
- `categories: Record<string, BulletLegendItemInterface>`
- `height: number`
- `xAxis?: keyof T`
- `xFormatter?: axisFormatter` and `xNumTicks?: number` when 24 labels need thinning
- `yLabel?: string` (for example `°C`)

`BulletLegendItemInterface` is `{ name: string | number; color?: string | string[]; ... }`.

Source: [playground/pages/line.vue](https://github.com/dennisadriaans/vue-chrts/blob/main/packages/nuxt-charts-next/playground/pages/line.vue), [playground/data/index.ts](https://github.com/dennisadriaans/vue-chrts/blob/main/packages/nuxt-charts-next/playground/data/index.ts), [src/runtime/types/charts.ts](https://github.com/dennisadriaans/vue-chrts/blob/main/packages/nuxt-charts-next/src/runtime/types/charts.ts), [src/runtime/types/shared.ts](https://github.com/dennisadriaans/vue-chrts/blob/main/packages/nuxt-charts-next/src/runtime/types/shared.ts).

## Published types

`package.json` exports `nuxt-charts/types` to `./dist/runtime/types.d.ts`. That barrel is `export type * from "./types/charts"`, which includes `LineChartProps<T>`. The module also auto-imports types when `autoImports` is left at its default `true`.

Source: [package.json exports](https://github.com/dennisadriaans/vue-chrts/blob/main/packages/nuxt-charts-next/package.json), [src/runtime/types.ts](https://github.com/dennisadriaans/vue-chrts/blob/main/packages/nuxt-charts-next/src/runtime/types.ts).

## Nuxt 4 and Tailwind

No documented incompatibility with Nuxt 4 or Tailwind.

The module pushes its own CSS (`theme.css`, `components.css`) and states those files use only `vc-*` / `--vc-*` selectors, not Tailwind utilities, so the host app's classes are untouched. The README calls Nuxt UI v4 a zero-config integration and not a dependency.

The playground is a Nuxt app with Tailwind 4 wired the same way shadcn-vue's Nuxt docs default to: `@tailwindcss/vite` in `vite.plugins`, plus `tailwindcss`. Its devDependencies include `@tailwindcss/vite` `^4.3.1` and `tailwindcss` `^4.3.1`. The package devDependencies include `tailwindcss` `^4.2.2` and `@tailwindcss/vite` `^4.2.2`.

Source: [src/module.ts](https://github.com/dennisadriaans/vue-chrts/blob/main/packages/nuxt-charts-next/src/module.ts), [README.md](https://github.com/dennisadriaans/vue-chrts/blob/main/packages/nuxt-charts-next/README.md), [playground/nuxt.config.ts](https://github.com/dennisadriaans/vue-chrts/blob/main/packages/nuxt-charts-next/playground/nuxt.config.ts), [playground/package.json](https://github.com/dennisadriaans/vue-chrts/blob/main/packages/nuxt-charts-next/playground/package.json).
