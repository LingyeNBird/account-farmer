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

const OPEN_RE = /^<<<([A-Z_]+)>>>$/
const CLOSE_RE = /^<<<\/([A-Z_]+)>>>$/

function isMarker(name: string): name is Marker {
  return (MARKERS as readonly string[]).includes(name)
}

function readBlocks(raw: string): Map<Marker, string> {
  const blocks = new Map<Marker, string>()
  let current: Marker | null = null
  let buffer: string[] = []

  for (const line of raw.replace(/\r\n/g, '\n').split('\n')) {
    const text = line.trim()
    const open = OPEN_RE.exec(text)
    if (open && isMarker(open[1])) {
      if (current) throw new ProtocolError(`块 ${current} 缺少结束标记 <<</${current}>>>`)
      current = open[1]
      buffer = []
      continue
    }

    const close = CLOSE_RE.exec(text)
    if (close) {
      if (!current || close[1] !== current) {
        throw new ProtocolError(`结束标记 <<</${close[1]}>>> 没有对应的开始标记`)
      }
      blocks.set(current, buffer.join('\n').trim())
      current = null
      buffer = []
      continue
    }

    if (current) buffer.push(line)
  }

  if (current) throw new ProtocolError(`块 ${current} 缺少结束标记 <<</${current}>>>`)
  return blocks
}

/** 取出 <<<TAG>>> 与 <<</TAG>>> 之间的内容，块外内容忽略。 */
export function extractTagged(raw: string, tag: string): string {
  const open = `<<<${tag}>>>`
  const close = `<<</${tag}>>>`
  const start = raw.indexOf(open)
  if (start === -1) throw new ProtocolError(`缺少 ${open} 标记`)
  const end = raw.lastIndexOf(close)
  if (end === -1 || end < start) throw new ProtocolError(`缺少 ${close} 标记`)
  return raw.slice(start + open.length, end).trim()
}

export function parseTurn(raw: string): ParsedTurn {
  const blocks = readBlocks(raw)
  const endBlock = blocks.get('END')

  if (endBlock !== undefined) {
    // 终止优先：模型常把收尾发言和终止写在同一轮，正文与反馈一律丢弃。
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
    const text = line.trim()
    const open = OPEN_RE.exec(text)
    if (open && isMarker(open[1])) {
      current = open[1]
      buffer = []
      continue
    }
    if (CLOSE_RE.test(text)) {
      current = null
      continue
    }
    if (index === lines.length - 1 && text.startsWith('<<<')) continue
    if (current === 'EN' || current === 'ZH' || current === 'FB_EN' || current === 'FB_ZH') {
      buffer.push(line)
    }
  }

  return buffer.join('\n').trim()
}
