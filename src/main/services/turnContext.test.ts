import { describe, expect, it } from 'vitest'
import type { Topic, Turn } from '@shared/types'
import { buildUserMessage } from './turnContext'

const topic: Topic = {
  id: 't1',
  seq: 1,
  batchId: 'b1',
  title: '缓存失效策略应优先考虑写放大',
  domains: ['数据库'],
  openingEn: 'Cache invalidation is usually framed as a consistency problem.',
  openingZh: '缓存失效通常被当成一致性问题。',
  status: 'active',
  createdAt: 0
}

const turn = (index: number, feedback: boolean): Turn => ({
  index,
  aiReply: `reply ${index}`,
  messageEn: `msg ${index}`,
  messageZh: `发言 ${index}`,
  feedback: feedback ? { verdict: 'good', en: 'solid', zh: '到位' } : undefined,
  suggestFeedback: false,
  roundsSinceSuggestion: 1,
  ended: false,
  createdAt: 0
})

describe('buildUserMessage', () => {
  it('控制变量只剩 round，不再暴露反馈节奏变量', () => {
    const text = buildUserMessage({
      current: { topic, turns: [turn(1, true)] },
      aiReply: '对方的第二条回复',
      round: 2
    })

    expect(text).toContain('# 控制变量\nround: 2')
    expect(text).not.toContain('replies_since_feedback')
    expect(text).not.toContain('force_feedback')
  })

  it('历史里带反馈的轮次会写明判定与反馈内容', () => {
    const text = buildUserMessage({
      current: { topic, turns: [turn(1, true), turn(2, false)] },
      aiReply: '第三条',
      round: 3
    })

    expect(text).toContain('反馈：good / solid')
    expect(text).toContain('### 第 2 轮')
  })

  it('没有历史轮次时省略该段', () => {
    const text = buildUserMessage({
      current: { topic, turns: [] },
      aiReply: '第一条回复',
      round: 1
    })

    expect(text).not.toContain('# 本主题已完成的轮次')
    expect(text).toContain('# 本轮对方回复\n第一条回复')
  })
})
