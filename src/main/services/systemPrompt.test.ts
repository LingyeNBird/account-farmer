import { describe, expect, it } from 'vitest'
import type { PromptKey } from '@shared/defaults'
import { composeSystemPrompt } from './systemPrompt'

const prompts: Record<PromptKey, string> = {
  system: 'SYSTEM',
  turn: 'TURN',
  topics: 'TOPICS',
  termination: 'TERMINATION'
}

describe('composeSystemPrompt', () => {
  it('按系统、回合、终止的顺序拼接', () => {
    expect(composeSystemPrompt(prompts)).toBe('SYSTEM\n\nTURN\n\nTERMINATION')
  })

  it('主题生成的提示词不参与回合调用', () => {
    expect(composeSystemPrompt(prompts)).not.toContain('TOPICS')
  })
})
