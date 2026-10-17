export type TurnFeedback = {
  verdict: 'good' | 'bad'
  en: string
  zh: string
}

export type ParsedTurn =
  | { kind: 'message'; en: string; zh: string; feedback?: TurnFeedback }
  | { kind: 'end'; reason: string }

export class ProtocolError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProtocolError'
  }
}

const MARKERS = ['EN', 'ZH', 'FB_VERDICT', 'FB_EN', 'FB_ZH', 'END'] as const

type Marker = (typeof MARKERS)[number]

const MARKER_RE = /^<<<([A-Z_]+)>>>$/

function isMarker(name: string): name is Marker {
  return (MARKERS as readonly string[]).includes(name)
}

function readBlocks(raw: string): Map<Marker, string> {
  const blocks = new Map<Marker, string>()
  let current: Marker | null = null
  let buffer: string[] = []

  const flush = (): void => {
    if (current) blocks.set(current, buffer.join('\n').trim())
  }

  for (const line of raw.replace(/\r\n/g, '\n').split('\n')) {
    const match = MARKER_RE.exec(line.trim())
    if (match && isMarker(match[1])) {
      flush()
      current = match[1]
      buffer = []
      continue
    }
    if (current) buffer.push(line)
  }
  flush()
  return blocks
}

export function parseTurn(raw: string): ParsedTurn {
  const blocks = readBlocks(raw)
  const endBlock = blocks.get('END')

  if (endBlock !== undefined) {
    // 终止优先：模型常把收尾发言和 END 写在同一轮，正文与反馈一律丢弃。
    return { kind: 'end', reason: endBlock }
  }

  const en = blocks.get('EN') ?? ''
  const zh = blocks.get('ZH') ?? ''
  if (!en) throw new ProtocolError('缺少 <<<EN>>> 正文')
  if (!zh) throw new ProtocolError('缺少 <<<ZH>>> 中文对照')

  const verdictRaw = blocks.get('FB_VERDICT')
  const fbEn = blocks.get('FB_EN')
  const fbZh = blocks.get('FB_ZH')
  const hasAnyFeedback = verdictRaw !== undefined || fbEn !== undefined || fbZh !== undefined

  if (!hasAnyFeedback) return { kind: 'message', en, zh }

  if (verdictRaw === undefined || fbEn === undefined || fbZh === undefined) {
    throw new ProtocolError('反馈三块必须同时出现')
  }
  const verdict = verdictRaw.trim().toLowerCase()
  if (verdict !== 'good' && verdict !== 'bad') {
    throw new ProtocolError(`反馈正负值不合法: ${verdictRaw}`)
  }
  if (!fbEn || !fbZh) throw new ProtocolError('反馈内容为空')

  return { kind: 'message', en, zh, feedback: { verdict, en: fbEn, zh: fbZh } }
}

/** 流式期间只显示当前正在写入的正文块，标记行一律隐藏。 */
export function streamingText(raw: string): string {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  let current: Marker | null = null
  let buffer: string[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const match = MARKER_RE.exec(line.trim())
    if (match && isMarker(match[1])) {
      current = match[1]
      buffer = []
      continue
    }
    if (index === lines.length - 1 && line.trimStart().startsWith('<<<')) continue
    if (current === 'EN' || current === 'ZH' || current === 'FB_EN' || current === 'FB_ZH') {
      buffer.push(line)
    }
  }

  return buffer.join('\n').trim()
}
