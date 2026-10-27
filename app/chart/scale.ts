function niceStep(raw: number) {
  if (!(raw > 0))
    return 1
  const power = 10 ** Math.floor(Math.log10(raw))
  const fraction = raw / power
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return nice * power
}

function round(value: number) {
  return Math.round(value * 1e6) / 1e6
}

export function valueDomain(values: number[]): [number, number] | null {
  const finite = values.filter(value => Number.isFinite(value))
  const min = finite.length === 0 ? null : Math.min(...finite)
  const max = finite.length === 0 ? null : Math.max(...finite)
  if (min === null || max === null)
    return null
  const span = max - min
  const pad = span === 0 ? Math.max(Math.abs(max) * 0.02, 0.5) : span * 0.12
  const nearZero = (min <= 0 && max >= 0)
    || (min >= 0 && min <= span)
    || (max <= 0 && Math.abs(max) <= span)
  let lower = min - pad
  let upper = max + pad
  if (nearZero && min >= 0)
    lower = 0
  if (nearZero && max <= 0)
    upper = 0
  const step = niceStep((upper - lower) / 4)
  let niceLower = round(Math.floor(lower / step) * step)
  let niceUpper = round(Math.ceil(upper / step) * step)
  if (niceLower === niceUpper)
    niceUpper = round(niceLower + step)
  if (!nearZero && lower > 0 && niceLower <= 0)
    niceLower = step
  if (!nearZero && upper < 0 && niceUpper >= 0)
    niceUpper = -step
  return [niceLower, niceUpper]
}
