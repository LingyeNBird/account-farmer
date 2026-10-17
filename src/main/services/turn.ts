import type { Api, AssistantMessage, Message, Model, Usage, UserMessage } from '@mariozechner/pi-ai'
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
  messages: Message[]
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
function assistantMessage(model: Model<Api>, text: string): AssistantMessage {
  return {
    role: 'assistant',
    content: [{ type: 'text', text }],
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
}

function exampleHistory(model: Model<Api>): Message[] {
  return FEWSHOT_MESSAGES.map((item): Message =>
    item.role === 'assistant'
      ? assistantMessage(model, item.content)
      : ({ role: 'user', content: item.content, timestamp: 0 } as UserMessage)
  )
}

/** 旧轮次没有 raw，就按标记格式重建一份，保证历史仍是合法输出形态。 */
function turnOutput(turn: Turn): string {
  if (turn.raw) return turn.raw
  const parts = [
    `<<<EN>>>\n${turn.messageEn}\n<<</EN>>>`,
    `<<<ZH>>>\n${turn.messageZh}\n<<</ZH>>>`
  ]
  if (turn.feedback) {
    parts.push(
      `<<<FB_VERDICT>>>\n${turn.feedback.verdict}\n<<</FB_VERDICT>>>`,
      `<<<FB_EN>>>\n${turn.feedback.en}\n<<</FB_EN>>>`,
      `<<<FB_ZH>>>\n${turn.feedback.zh}\n<<</FB_ZH>>>`
    )
  }
  return parts.join('\n\n')
}

const HISTORY_BUDGET = 400_000

/** 把会话还原成真实消息序列：开场回复 → (我方输出 → 对方回复)* → 本轮回复。 */
function buildConversation(session: Session, reply: string, model: Model<Api>): Message[] {
  const turns = [...session.turns]
  let size = turns.reduce((total, turn) => total + turnOutput(turn).length + (turn.reply?.length ?? 0), 0)
  while (size > HISTORY_BUDGET && turns.length > 2) {
    const dropped = turns.shift()
    if (!dropped) break
    size -= turnOutput(dropped).length + (dropped.reply?.length ?? 0)
  }

  const messages: Message[] = []
  if (session.openingReply) {
    messages.push({ role: 'user', content: session.openingReply, timestamp: 0 })
  }
  for (const turn of turns) {
    if (turn.messageEn) messages.push(assistantMessage(model, turnOutput(turn)))
    if (turn.reply) messages.push({ role: 'user', content: turn.reply, timestamp: 0 })
  }
  messages.push({ role: 'user', content: reply, timestamp: Date.now() })
  return messages
}

async function streamOnce(options: RunOptions): Promise<{ raw: string; usage: Usage }> {
  const { streamSimple } = await loadPiAi()
  const effort =
    options.model.reasoning && options.effort && options.effort !== 'off' ? options.effort : undefined

  const events = streamSimple(
    options.model,
    {
      systemPrompt: options.systemPrompt,
      messages: options.messages
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
  return { raw, usage: final.usage }
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
  const systemPrompt = `${composeSystemPrompt(prompts)}\n\n# 主题\n标题：${topic.title}\n领域：${topic.domains.join('、')}\n开场英文：${topic.openingEn}\n开场中文：${topic.openingZh}`

  const history = buildConversation(session, options.reply, model)
  const messages: Message[] = [...exampleHistory(model), ...history]

  const run = (extra: string): Promise<{ raw: string; usage: Usage }> =>
    streamOnce({
      model,
      apiKey,
      systemPrompt: extra ? `${systemPrompt}\n\n${extra}` : systemPrompt,
      messages,
      effort: settings.provider.reasoningEffort,
      signal: options.signal,
      onDelta: options.onDelta
    })

  let attempt = await run('')
  let raw = attempt.raw
  let usage = attempt.usage
  let usedSystemPrompt = systemPrompt
  let parsed: ParsedTurn
  try {
    parsed = parseTurn(raw)
  } catch (error) {
    if (!(error instanceof ProtocolError)) throw error
    console.warn('[turn] 解析失败:', error.message, '\n--- 原始输出 ---\n', raw)
    options.onDelta('')
    const correction = [
      `上一次输出不符合格式（${error.message}）。`,
      '本次只输出分隔块，不要任何解释。',
      '每个块都要用开始和结束标记包起来，例如 <<<EN>>> 与 <<</EN>>>。',
      '继续对话：输出 EN、ZH（反馈可选）。结束：整轮只输出 <<<END>>> 与 <<</END>>> 中间的一行理由。'
    ].join('\n')
    usedSystemPrompt = `${systemPrompt}\n\n${correction}`
    attempt = await run(correction)
    raw = attempt.raw
    usage = {
      ...usage,
      input: usage.input + attempt.usage.input,
      output: usage.output + attempt.usage.output,
      cacheRead: usage.cacheRead + attempt.usage.cacheRead,
      cacheWrite: usage.cacheWrite + attempt.usage.cacheWrite,
      totalTokens: usage.totalTokens + attempt.usage.totalTokens,
      cost: {
        input: usage.cost.input + attempt.usage.cost.input,
        output: usage.cost.output + attempt.usage.cost.output,
        cacheRead: usage.cost.cacheRead + attempt.usage.cost.cacheRead,
        cacheWrite: usage.cost.cacheWrite + attempt.usage.cost.cacheWrite,
        total: usage.cost.total + attempt.usage.cost.total
      }
    }
    try {
      parsed = parseTurn(raw)
    } catch (retryError) {
      console.warn('[turn] 重试后仍失败:', (retryError as Error).message, '\n--- 原始输出 ---\n', raw)
      throw retryError
    }
  }

  const debug = {
    systemPrompt: usedSystemPrompt,
    messages: messages.map((message) => ({
      role: message.role,
      content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
    })),
    rawReply: raw,
    exampleCount: FEWSHOT_MESSAGES.length,
    exampleChars: FEWSHOT_MESSAGES.reduce((total, item) => total + item.content.length, 0),
    usage: {
      input: usage.input,
      output: usage.output,
      cacheRead: usage.cacheRead,
      cacheWrite: usage.cacheWrite,
      totalTokens: usage.totalTokens
    },
    params: {
      provider: model.provider,
      model: model.id,
      reasoning: settings.provider.reasoningEffort || null,
      maxTokens: model.maxTokens
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
          debug,
          createdAt: Date.now()
        }
      : {
          index: session.turns.length + 1,
          messageEn: parsed.en,
          messageZh: parsed.zh,
          feedback: parsed.feedback,
          raw,
          ended: false,
          debug,
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
