import { describe, expect, it } from 'vitest'
import type { Turn } from '@shared/types'
import { countRepliesSinceFeedback, fillFeedbackDirective } from './feedback'

const turn = (index: number, hasFeedback: boolean): Turn => ({
  index,
  aiReply: '',
  messageEn: 'x',
  messageZh: 'x',
  feedback: hasFeedback ? { verdict: 'good', en: 'ok', zh: '好' } : undefined,
  ended: false,
  createdAt: 0
})

describe('countRepliesSinceFeedback', () => {
  it('没有轮次时为零', () => {
    expect(countRepliesSinceFeedback([])).toBe(0)
  })

  it('最新一轮有反馈时为零', () => {
    expect(countRepliesSinceFeedback([turn(1, true), turn(2, true)])).toBe(0)
  })

  it('只数最新的连续无反馈轮次', () => {
    expect(countRepliesSinceFeedback([turn(1, true), turn(2, false), turn(3, false)])).toBe(2)
  })

  it('全部无反馈时等于轮数', () => {
    expect(countRepliesSinceFeedback([turn(1, false), turn(2, false), turn(3, false)])).toBe(3)
  })
})

describe('fillFeedbackDirective', () => {
  it('替换模板里的轮数变量', () => {
    expect(fillFeedbackDirective('已连续 {{replies_since_feedback}} 轮', 4)).toBe('已连续 4 轮')
    expect(fillFeedbackDirective('{{replies_since_feedback}}/{{replies_since_feedback}}', 2)).toBe('2/2')
  })

  it('没有变量时原样返回', () => {
    expect(fillFeedbackDirective('固定文案', 3)).toBe('固定文案')
  })
})
