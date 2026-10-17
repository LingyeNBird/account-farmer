import type { Api, AssistantMessage, Message, Model, UserMessage } from '@mariozechner/pi-ai'
import type { ReasoningEffort, Session, Turn } from '@shared/types'
import { ProtocolError, parseTurn, streamingText, type ParsedTurn } from '@shared/protocol'
import { loadPrompts } from '../store/prompts'
import { getApiKey } from '../store/secrets'
import { loadSession, saveSession } from '../store/sessions'
import { loadSettings } from '../store/settings'
import { archiveTopic, listTopics } from '../store/topics'
import { createEmitThrottle } from './emitThrottle'
import { buildModel } from './llm'
import { composeSystemPrompt } from './systemPrompt'
import { buildUserMessage } from './turnContext'
import { FEWSHOT_MESSAGES } from '@shared/fewshot'

const loadPiAi = () => import('@mariozechner/pi-ai')


type GenerateTurnOptions = {
  accountId: string
  topicId: string
  reply: string
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

const DELTA_INTERVAL_MS = 40

/** 本次粘贴的回复属于上一条发言：没有轮次时挂在开场，否则挂在最后一轮。 */
function attachReply(session: Session, reply: string, turn: Turn): Session {
  if (session.turns.length === 0) {
    return { ...session, openingReply: reply, turns: [turn] }
  }
  const turns = session.turns.map((item, index) =>
    index === session.turns.length - 1 ? { ...item, reply } : item
  )
  return { ...session, turns: [...turns, turn] }
}

/** 示例按消息历史注入：assistant 消息要补齐 pi-ai 需要的元信息。 */
function exampleHistory(model: Model<Api>): Message[] {
  return FEWSHOT_MESSAGES.map((item): Message => {
    if (item.role === 'assistant') {
      const message: AssistantMessage = {
        role: 'assistant',
        content: [{ type: 'text', text: item.content }],
        api: model.api,
        provider: model.provider,
        model: model.id,
        usage: {
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 0,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
        },
        stopReason: 'stop',
        timestamp: 0
      }
      return message
    }
    const message: UserMessage = { role: 'user', content: item.content, timestamp: 0 }
    return message
  })
}

async function streamOnce(options: RunOptions): Promise<string> {
  const { streamSimple } = await loadPiAi()
  const effort =
    options.model.reasoning && options.effort && options.effort !== 'off' ? options.effort : undefined

  const events = streamSimple(
    options.model,
    {
      systemPrompt: options.systemPrompt,
      messages: [
        ...exampleHistory(options.model),
        { role: 'user', content: options.userMessage, timestamp: Date.now() }
      ]
    },
    {
      apiKey: options.apiKey,
      signal: options.signal,
      ...(effort ? { reasoning: effort } : {})
    }
  )

  let raw = ''
  const throttle = createEmitThrottle<string>(
    (buffered) => options.onDelta(streamingText(buffered)),
    DELTA_INTERVAL_MS
  )
  for await (const event of events) {
    if (event.type === 'text_delta') {
      raw += event.delta
      throttle.push(raw)
    }
  }
  throttle.end()

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
      messageEn: '',
      messageZh: '',
      ended: true,
      endReason: `达到上限 ${maxRounds} 轮`,
      createdAt: Date.now()
    }
    await saveSession(
      options.accountId,
      options.topicId,
      attachReply(session, options.reply, endedTurn)
    )
    await archiveTopic(options.accountId, options.topicId)
    return endedTurn
  }

  const prompts = await loadPrompts()
  const systemPrompt = composeSystemPrompt(prompts)

  const userMessage = buildUserMessage({
    topic,
    openingReply: session.openingReply,
    turns: session.turns,
    reply: options.reply,
    round: session.turns.length + 1
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
          messageEn: '',
          messageZh: '',
          ended: true,
          endReason: parsed.reason,
          createdAt: Date.now()
        }
      : {
          index: session.turns.length + 1,
          messageEn: parsed.en,
          messageZh: parsed.zh,
          feedback: parsed.feedback,
          ended: false,
          createdAt: Date.now()
        }

  await saveSession(
    options.accountId,
    options.topicId,
    attachReply(session, options.reply, turn)
  )
  if (turn.ended) await archiveTopic(options.accountId, options.topicId)
  return turn
}
