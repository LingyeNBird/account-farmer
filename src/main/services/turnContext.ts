import type { Topic, Turn } from '@shared/types'

export type ContextTopic = { topic: Topic; turns: Turn[] }

const MAX_CONTEXT_CHARS = 30000

function formatTurn(turn: Turn): string {
  const lines = [`### 第 ${turn.index} 轮`, `对方回复：${turn.aiReply}`]
  if (turn.messageEn) lines.push(`我方发言：${turn.messageEn}`)
  if (turn.feedback) lines.push(`反馈：${turn.feedback.verdict} / ${turn.feedback.en}`)
  return lines.join('\n')
}

/** 超出预算时从最旧的轮次开始丢，至少保留最近两轮。 */
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
  aiReply: string
  round: number
}): string {
  const { current } = input
  const turns = trimTurns(current.turns, Math.floor(MAX_CONTEXT_CHARS * 0.6))
  const history = turns.map(formatTurn).join('\n\n')

  const sections = [
    `# 主题简报\n标题：${current.topic.title}\n领域：${current.topic.domains.join('、')}\n开场英文：${current.topic.openingEn}`,
    history ? `# 本主题已完成的轮次\n${history}` : '',
    `# 本轮对方回复\n${input.aiReply}`,
    `# 控制变量\nround: ${input.round}`
  ]

  return sections.filter(Boolean).join('\n\n')
}
