import type { Api, AssistantMessage, Model } from '@mariozechner/pi-ai'
import type { TopicDraft } from '@shared/types'
import { loadPrompts } from '../store/prompts'

const loadPiAi = () => import('@mariozechner/pi-ai')

const CHUNK_SIZE = 4

type GenerateOptions = {
  model: Model<Api>
  apiKey: string
  count: number
  existingTitles: string[]
  signal: AbortSignal
  onChunk: (accepted: TopicDraft[]) => void
}

function extractText(message: AssistantMessage): string {
  return message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

function stripFence(text: string): string {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end === -1 || end < start) throw new Error('主题输出不是 JSON 数组')
  return text.slice(start, end + 1)
}

function isDraft(value: unknown): value is TopicDraft {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return (
    typeof item.title === 'string' &&
    Array.isArray(item.domains) &&
    item.domains.every((domain) => typeof domain === 'string') &&
    typeof item.openingEn === 'string' &&
    typeof item.openingZh === 'string'
  )
}

const normalize = (title: string): string => title.replace(/[\s\p{P}]/gu, '').toLowerCase()

export function isDuplicate(title: string, existing: string[]): boolean {
  const candidate = normalize(title)
  return existing.some((item) => {
    const other = normalize(item)
    if (!other || !candidate) return false
    if (other === candidate) return true
    const unique = [...other].filter((char, index, all) => all.indexOf(char) === index)
    const shared = unique.filter((char) => candidate.includes(char)).length
    return shared / Math.min(other.length, candidate.length) >= 0.8
  })
}

export async function generateTopics(options: GenerateOptions): Promise<TopicDraft[]> {
  const { completeSimple } = await loadPiAi()
  const prompts = await loadPrompts()
  const accepted: TopicDraft[] = []
  const known = [...options.existingTitles]
  let attempts = 0

  while (accepted.length < options.count && attempts < options.count + CHUNK_SIZE) {
    attempts += 1
    const remaining = Math.min(CHUNK_SIZE, options.count - accepted.length)
    const message = await completeSimple(
      options.model,
      {
        systemPrompt: prompts.topics,
        messages: [
          {
            role: 'user',
            content: [
              `生成 ${remaining} 个主题。`,
              known.length > 0 ? `已有标题（必须避开，不要重复或近似）：\n${known.join('\n')}` : '',
              '只输出 JSON 数组。'
            ]
              .filter(Boolean)
              .join('\n\n'),
            timestamp: Date.now()
          }
        ]
      },
      { apiKey: options.apiKey, maxTokens: 8192, signal: options.signal }
    )

    if (message.stopReason === 'error') throw new Error(message.errorMessage ?? '主题生成失败')

    const raw = stripFence(extractText(message))
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('主题输出不是数组')

    for (const item of parsed) {
      if (!isDraft(item)) continue
      if (isDuplicate(item.title, known)) continue
      known.push(item.title)
      accepted.push(item)
      if (accepted.length >= options.count) break
    }

    options.onChunk(accepted)
  }

  if (accepted.length === 0) throw new Error('没有生成出有效主题')
  return accepted
}
