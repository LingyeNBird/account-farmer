import { describe, expect, it } from 'vitest'
import type { PromptKey } from '@shared/defaults'
import { composeSystemPrompt } from './systemPrompt'

const prompts: Record<PromptKey, string> = {
  system: 'SYSTEM',
  turn: 'TURN',
  topics: 'TOPICS',
  feedbackFallback: 'FALLBACK {{replies_since_feedback}}',
  termination: 'TERMINATION'
}

describe('composeSystemPrompt', () => {
  it('默认包含系统、回合与终止三段', () => {
    const text = composeSystemPrompt(prompts, false, 2)
    expect(text).toBe('SYSTEM\n\nTURN\n\nTERMINATION')
  })

  it('强制反馈时在终止之前插入兜底指令', () => {
    const text = composeSystemPrompt(prompts, true, 4)
    expect(text).toBe('SYSTEM\n\nTURN\n\nFALLBACK 4\n\nTERMINATION')
  })

  it('主题生成的提示词不参与回合调用', () => {
    expect(composeSystemPrompt(prompts, false, 0)).not.toContain('TOPICS')
  })
})
