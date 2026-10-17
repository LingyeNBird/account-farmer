import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PROMPTS,
  PROMPT_KEYS,
  PROMPT_LABELS,
  PROMPT_SCOPES,
  PROMPT_TAGS,
  PROMPT_VARIABLES
} from './defaults'

describe('提示词清单', () => {
  it('不再包含已删除的反馈兜底', () => {
    expect(PROMPT_KEYS as readonly string[]).not.toContain('feedbackFallback')
    expect(Object.keys(DEFAULT_PROMPTS)).toEqual([...PROMPT_KEYS])
  })

  it('每个提示词都有默认值、标签、作用域与标记说明', () => {
    for (const key of PROMPT_KEYS) {
      expect(DEFAULT_PROMPTS[key].trim().length).toBeGreaterThan(0)
      expect(PROMPT_LABELS[key].length).toBeGreaterThan(0)
      expect(PROMPT_SCOPES[key]).toBe('global')
      expect(Array.isArray(PROMPT_TAGS[key])).toBe(true)
    }
  })

  it('没有任何提示词再引用反馈节奏变量', () => {
    for (const key of PROMPT_KEYS) {
      expect(PROMPT_VARIABLES[key]).not.toContain('replies_since_feedback')
      expect(DEFAULT_PROMPTS[key]).not.toContain('replies_since_feedback')
      expect(DEFAULT_PROMPTS[key]).not.toContain('force_feedback')
    }
  })
})

describe('反馈要求', () => {
  it('反馈由模型自行判断，不再强制每轮输出', () => {
    expect(DEFAULT_PROMPTS.system).toContain('有明确判断时追加这三个块')
    expect(DEFAULT_PROMPTS.system).not.toContain('每一轮都要给出')
    expect(DEFAULT_PROMPTS.turn).toContain('不必每轮都有')
    expect(DEFAULT_PROMPTS.turn).not.toContain('每一轮都要给出')
  })

  it('三个反馈标记仍在系统提示词的保护清单里', () => {
    expect(PROMPT_TAGS.system).toEqual(
      expect.arrayContaining(['<<<FB_VERDICT>>>', '<<<FB_EN>>>', '<<<FB_ZH>>>'])
    )
  })
})
