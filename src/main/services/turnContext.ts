import type { Topic, Turn } from '@shared/types'

export type ContextTopic = { topic: Topic; turns: Turn[] }

const MAX_CONTEXT_CHARS = 30000

function formatTurn(turn: Turn): string {
  const lines = [`### 第 ${turn.index} 轮`, `对方回复：${turn.aiReply}`]
  if (turn.messageEn) lines.push(`我方发言：${turn.messageEn}`)
  if (turn.feedback) lines.push(`反馈：${turn.feedback.verdict} / ${turn.feedback.en}`)
  return lines.join('\n')
}

function formatTopic(topic: Topic, turns: Turn[]): string {
  const head = `## 主题 ${topic.seq}：${topic.title}\n领域：${topic.domains.join('、')}`
  if (turns.length === 0) return head
  return `${head}\n${turns.map(formatTurn).join('\n\n')}`
}

/** 超出预算时从最旧的轮次开始丢，当前主题至少保留最近两轮。 */
function trimTurns(turns: Turn[], budget: number): Turn[] {
  const kept = [...turns]
  let size = kept.reduce((total, turn) => total + formatTurn(turn).length, 0)
  while (size > budget && kept.length > 2) {
    const dropped = kept.shift()
    if (!dropped) break
    size -= formatTurn(dropped).length
  }
  return kept
}

export function buildUserMessage(input: {
  current: ContextTopic
  recent: ContextTopic[]
  aiReply: string
  round: number
  repliesSinceFeedback: number
  forceFeedback: boolean
}): string {
  const { current, recent } = input
  let budget = Math.floor(MAX_CONTEXT_CHARS * 0.6)

  const recentBlocks: string[] = []
  for (const entry of recent) {
    const block = formatTopic(entry.topic, entry.turns)
    if (block.length > budget) break
    recentBlocks.push(block)
    budget -= block.length
  }

  const currentTurns = trimTurns(current.turns, budget)
  const currentBlock = formatTopic(current.topic, currentTurns)

  const sections = [
    `# 主题简报\n标题：${current.topic.title}\n领域：${current.topic.domains.join('、')}\n开场英文：${current.topic.openingEn}`,
    recentBlocks.length > 0
      ? `# 早先主题（仅供避免重复，不要在本主题中提起）\n${recentBlocks.join('\n\n')}`
      : '',
    currentBlock,
    `# 本轮对方回复\n${input.aiReply}`,
    `# 控制变量\nround: ${input.round}\nreplies_since_feedback: ${input.repliesSinceFeedback}\nforce_feedback: ${input.forceFeedback}`
  ]

  return sections.filter(Boolean).join('\n\n')
}
