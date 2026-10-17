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

const turn = (index: number, reply?: string): Turn => ({
  index,
  messageEn: `msg ${index}`,
  messageZh: `发言 ${index}`,
  feedback: index === 1 ? { verdict: 'good', en: 'solid', zh: '到位' } : undefined,
  reply,
  ended: false,
  createdAt: 0
})

describe('buildUserMessage', () => {
  it('控制变量只剩 round，不再暴露反馈节奏变量', () => {
    const text = buildUserMessage({
      topic,
      openingReply: '对方对开场的回复',
      turns: [turn(1, '对方对第一轮的回复')],
      reply: '对方的第二条回复',
      round: 2
    })

    expect(text).toContain('# 控制变量\nround: 2')
    expect(text).not.toContain('replies_since_feedback')
    expect(text).not.toContain('force_feedback')
  })

  it('历史按「我方发言 → 对方回复」的顺序排列', () => {
    const text = buildUserMessage({
      topic,
      openingReply: '开场的回复',
      turns: [turn(1, '第一轮的回复')],
      reply: '本轮输入',
      round: 2
    })

    const mine = text.indexOf('我方发言：msg 1')
    const theirs = text.indexOf('对方回复：第一轮的回复')
    expect(mine).toBeGreaterThan(-1)
    expect(theirs).toBeGreaterThan(mine)
    expect(text.indexOf('反馈：good / solid')).toBeGreaterThan(theirs)
  })

  it('开场回复单独成段，放在历史之前', () => {
    const text = buildUserMessage({
      topic,
      openingReply: '开场的回复',
      turns: [turn(1, '第一轮的回复')],
      reply: '本轮输入',
      round: 2
    })

    const opening = text.indexOf('# 开场后对方的回复')
    expect(opening).toBeGreaterThan(-1)
    expect(text.indexOf('# 本主题已完成的轮次')).toBeGreaterThan(opening)
  })

  it('没有历史轮次时省略该段，开场回复仍然保留', () => {
    const text = buildUserMessage({
      topic,
      openingReply: '开场的回复',
      turns: [],
      reply: '第一条回复',
      round: 1
    })

    expect(text).not.toContain('# 本主题已完成的轮次')
    expect(text).toContain('# 开场后对方的回复\n开场的回复')
    expect(text).toContain('# 本轮对方回复\n第一条回复')
  })
})
