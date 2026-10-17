import type { Api, Model } from '@mariozechner/pi-ai'
import type { ReasoningEffort, Turn } from '@shared/types'
import { ProtocolError, parseTurn, streamingText, type ParsedTurn } from '@shared/protocol'
import { loadPrompts } from '../store/prompts'
import { getApiKey } from '../store/secrets'
import { appendTurn, loadSession } from '../store/sessions'
import { loadSettings } from '../store/settings'
import { archiveTopic, listTopics } from '../store/topics'
import { buildModel } from './llm'
import { countRepliesSinceFeedback } from './feedback'
import { composeSystemPrompt } from './systemPrompt'
import { buildUserMessage } from './turnContext'

const loadPiAi = () => import('@mariozechner/pi-ai')


type GenerateTurnOptions = {
  accountId: string
  topicId: string
  aiReply: string
  signal: AbortSignal
  onDelta: (text: string) => void
}

type RunOptions = {
  model: Model<Api>
  apiKey: string
  systemPrompt: string
  userMessage: string
  effort: ReasoningEffort
  signal: AbortSignal
  onDelta: (text: string) => void
}

async function streamOnce(options: RunOptions): Promise<string> {
  const { streamSimple } = await loadPiAi()
  const effort =
    options.model.reasoning && options.effort && options.effort !== 'off' ? options.effort : undefined

  const events = streamSimple(
    options.model,
    {
      systemPrompt: options.systemPrompt,
      messages: [{ role: 'user', content: options.userMessage, timestamp: Date.now() }]
    },
    {
      apiKey: options.apiKey,
      signal: options.signal,
      ...(effort ? { reasoning: effort } : {})
    }
  )

  let raw = ''
  for await (const event of events) {
    if (event.type === 'text_delta') {
      raw += event.delta
      options.onDelta(streamingText(raw))
    }
  }

  const final = await events.result()
  if (final.stopReason === 'aborted') throw new Error('已取消')
  if (final.stopReason === 'error') throw new Error(final.errorMessage ?? '生成失败')
  return raw
}

export async function generateTurn(options: GenerateTurnOptions): Promise<Turn> {
  const settings = await loadSettings()
  const apiKey = await getApiKey()
  if (!apiKey) throw new Error('缺少 API Key')

  const model = await buildModel(settings.provider)
  const topics = await listTopics(options.accountId)
  const topic = topics.find((item) => item.id === options.topicId)
  if (!topic) throw new Error('主题不存在')

  const session = await loadSession(options.accountId, options.topicId)

  const maxRounds = settings.limits.maxRounds
  if (session.turns.length >= maxRounds) {
    const endedTurn: Turn = {
      index: session.turns.length + 1,
      aiReply: options.aiReply,
      messageEn: '',
      messageZh: '',
      ended: true,
      endReason: `达到上限 ${maxRounds} 轮`,
      createdAt: Date.now()
    }
    await appendTurn(options.accountId, options.topicId, endedTurn)
    await archiveTopic(options.accountId, options.topicId)
    return endedTurn
  }

  const prompts = await loadPrompts()
  const repliesSinceFeedback = countRepliesSinceFeedback(session.turns)
  const forceFeedback = repliesSinceFeedback >= settings.feedback.fallbackAfter
  const systemPrompt = composeSystemPrompt(prompts, forceFeedback, repliesSinceFeedback)

  const userMessage = buildUserMessage({
    current: { topic, turns: session.turns },
    aiReply: options.aiReply,
    round: session.turns.length + 1,
    repliesSinceFeedback,
    forceFeedback
  })

  const run = (extra: string): Promise<string> =>
    streamOnce({
      model,
      apiKey,
      systemPrompt: extra ? `${systemPrompt}\n\n${extra}` : systemPrompt,
      userMessage,
      effort: settings.provider.reasoningEffort,
      signal: options.signal,
      onDelta: options.onDelta
    })

  let raw = await run('')
  let parsed: ParsedTurn
  try {
    parsed = parseTurn(raw)
  } catch (error) {
    if (!(error instanceof ProtocolError)) throw error
    console.warn('[turn] 解析失败:', error.message, '\n--- 原始输出 ---\n', raw)
    options.onDelta('')
    raw = await run(
      [
        `上一次输出不符合格式（${error.message}）。`,
        '本次只输出分隔块，不要任何解释。',
        '每个块都要用开始和结束标记包起来，例如 <<<EN>>> 与 <<</EN>>>。',
        '继续对话：输出 EN、ZH（反馈可选）。结束：整轮只输出 <<<END>>> 与 <<</END>>> 中间的一行理由。'
      ].join('\n')
    )
    try {
      parsed = parseTurn(raw)
    } catch (retryError) {
      console.warn('[turn] 重试后仍失败:', (retryError as Error).message, '\n--- 原始输出 ---\n', raw)
      throw retryError
    }
  }

  const turn: Turn =
    parsed.kind === 'end'
      ? {
          index: session.turns.length + 1,
          aiReply: options.aiReply,
          messageEn: '',
          messageZh: '',
          ended: true,
          endReason: parsed.reason,
          createdAt: Date.now()
        }
      : {
          index: session.turns.length + 1,
          aiReply: options.aiReply,
          messageEn: parsed.en,
          messageZh: parsed.zh,
          feedback: parsed.feedback,
          ended: false,
          createdAt: Date.now()
        }

  await appendTurn(options.accountId, options.topicId, turn)
  if (turn.ended) await archiveTopic(options.accountId, options.topicId)
  return turn
}
