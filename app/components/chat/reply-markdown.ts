export type Inline
  = { type: 'text', text: string }
    | { type: 'strong', inlines: Inline[] }
    | { type: 'em', inlines: Inline[] }
    | { type: 'code', text: string }
    | { type: 'break' }

export type Block
  = { type: 'paragraph', inlines: Inline[] }
    | { type: 'heading', level: number, inlines: Inline[] }
    | { type: 'list', ordered: boolean, items: Inline[][] }
    | { type: 'table', header: Inline[][], rows: Inline[][][] }
    | { type: 'code', text: string }

export function presentReply(source: string) {
  return source
    .replace(/[\u2018\u2019]/g, '\'')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/,\s*,+/g, ',')
    .replace(/\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function cells(line: string) {
  const trimmed = line.trim()
  const body = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed
  const end = body.endsWith('|') ? body.slice(0, -1) : body
  return end.split('|').map(cell => cell.trim())
}

function isSeparator(line: string) {
  const parts = cells(line)
  return parts.length > 1 && parts.every(cell => /^:?-{3,}:?$/.test(cell))
}

function isTableStart(lines: string[], index: number) {
  const header = lines[index]
  const separator = lines[index + 1]
  if (header === undefined || separator === undefined || !header.includes('|'))
    return false
  return cells(header).length > 1 && isSeparator(separator)
}

function parseInlines(input: string): Inline[] {
  const nodes: Inline[] = []
  let buffer = ''
  let index = 0

  function flush() {
    if (buffer === '')
      return
    nodes.push({ type: 'text', text: buffer })
    buffer = ''
  }

  while (index < input.length) {
    const marker = input.startsWith('**', index)
      ? '**'
      : input.startsWith('__', index)
        ? '__'
        : ''
    if (marker !== '') {
      const end = input.indexOf(marker, index + marker.length)
      if (end !== -1) {
        flush()
        nodes.push({ type: 'strong', inlines: parseInlines(input.slice(index + marker.length, end)) })
        index = end + marker.length
        continue
      }
    }
    const character = input[index] ?? ''
    const wordBefore = index > 0 && /[\p{L}\p{N}]/u.test(input[index - 1] ?? '')
    if ((character === '*' || (character === '_' && !wordBefore)) && input[index + 1] !== character) {
      const end = input.indexOf(character, index + 1)
      const wordAfter = end !== -1 && /[\p{L}\p{N}]/u.test(input[end + 1] ?? '')
      if (end > index + 1 && !(character === '_' && wordAfter)) {
        flush()
        nodes.push({ type: 'em', inlines: parseInlines(input.slice(index + 1, end)) })
        index = end + 1
        continue
      }
    }
    if (character === '`') {
      const end = input.indexOf('`', index + 1)
      if (end !== -1) {
        flush()
        nodes.push({ type: 'code', text: input.slice(index + 1, end) })
        index = end + 1
        continue
      }
    }
    buffer += character
    index += 1
  }
  flush()
  return nodes
}

function joinLines(lines: string[]) {
  const inlines: Inline[] = []
  for (const [index, line] of lines.entries()) {
    if (index > 0)
      inlines.push({ type: 'break' })
    inlines.push(...parseInlines(line))
  }
  return inlines
}

export function parseReply(source: string): Block[] {
  const lines = presentReply(source).split('\n')
  const blocks: Block[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index] ?? ''
    if (line === '') {
      index += 1
      continue
    }
    if (line.startsWith('```')) {
      const code: string[] = []
      index += 1
      while (index < lines.length && !(lines[index] ?? '').startsWith('```')) {
        code.push(lines[index] ?? '')
        index += 1
      }
      index += 1
      blocks.push({ type: 'code', text: code.join('\n') })
      continue
    }
    if (isTableStart(lines, index)) {
      const header = cells(line).map(cell => parseInlines(cell))
      index += 2
      const rows: Inline[][][] = []
      while (index < lines.length && (lines[index] ?? '').includes('|') && !isSeparator(lines[index] ?? '')) {
        rows.push(cells(lines[index] ?? '').map(cell => parseInlines(cell)))
        index += 1
      }
      blocks.push({ type: 'table', header, rows })
      continue
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading?.[1] && heading[2] !== undefined) {
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        inlines: parseInlines(heading[2]),
      })
      index += 1
      continue
    }
    const listMarker = /^([-*]|\d+\.)\s+(.*)$/.exec(line)
    if (listMarker) {
      const ordered = listMarker[1] !== '-' && listMarker[1] !== '*'
      const items: Inline[][] = []
      while (index < lines.length) {
        const item = /^([-*]|\d+\.)\s+(.*)$/.exec(lines[index] ?? '')
        if (!item?.[1] || item[2] === undefined)
          break
        const itemOrdered = item[1] !== '-' && item[1] !== '*'
        if (itemOrdered !== ordered)
          break
        items.push(parseInlines(item[2]))
        index += 1
      }
      blocks.push({ type: 'list', ordered, items })
      continue
    }
    const paragraph: string[] = []
    while (index < lines.length) {
      const next = lines[index] ?? ''
      if (next === '' || next.startsWith('```') || /^(#{1,6})\s+/.test(next) || /^([-*]|\d+\.)\s+/.test(next) || isTableStart(lines, index))
        break
      paragraph.push(next)
      index += 1
    }
    if (paragraph.length > 0)
      blocks.push({ type: 'paragraph', inlines: joinLines(paragraph) })
  }

  return blocks
}

export function replyHasTable(source: string) {
  return parseReply(source).some(block => block.type === 'table')
}
