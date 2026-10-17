import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { streamingText } from '@shared/protocol'
import { createEmitThrottle } from './emitThrottle'

describe('createEmitThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('爆发式更新只发首帧和结尾的一帧', () => {
    const seen: string[] = []
    const throttle = createEmitThrottle<string>((value) => seen.push(value), 40)

    throttle.push('a')
    for (const value of ['ab', 'abc', 'abcd', 'abcde']) throttle.push(value)

    expect(seen).toEqual(['a'])

    vi.advanceTimersByTime(40)
    expect(seen).toEqual(['a', 'abcde'])

    throttle.end()
    expect(seen).toEqual(['a', 'abcde'])
  })

  it('间隔足够时每条都立刻发出去', () => {
    const seen: string[] = []
    const throttle = createEmitThrottle<string>((value) => seen.push(value), 40)

    throttle.push('a')
    vi.advanceTimersByTime(50)
    throttle.push('ab')

    expect(seen).toEqual(['a', 'ab'])
  })

  it('end 会把未发出的最新值补上', () => {
    const seen: string[] = []
    const throttle = createEmitThrottle<string>((value) => seen.push(value), 40)

    throttle.push('a')
    throttle.push('ab')
    throttle.push('abc')
    throttle.end()

    expect(seen).toEqual(['a', 'abc'])
    vi.advanceTimersByTime(200)
    expect(seen).toEqual(['a', 'abc'])
  })
})

describe('流式增量与节流组合', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('节流后的输出始终是解析后的正文，不含协议标记', () => {
    const emitted: string[] = []
    const throttle = createEmitThrottle<string>(
      (buffered) => emitted.push(streamingText(buffered)),
      40
    )

    // 模拟真实的流式分片：标记独占一行，正文逐字到达
    const tokens = [
      '<<<EN>>>\n',
      'Hello',
      ' there,',
      ' world.\n',
      '<<</EN>>>\n',
      '<<<ZH>>>\n',
      '你好，',
      '世界。\n',
      '<<</ZH>>>'
    ]
    let raw = ''
    for (const token of tokens) {
      raw += token
      throttle.push(raw)
      vi.advanceTimersByTime(10)
    }
    throttle.end()

    // 生成期间显示的始终是当前块正文，协议标记不外泄
    expect(emitted.length).toBeGreaterThan(0)
    expect(emitted.every((text) => !text.includes('<<<'))).toBe(true)
    expect(emitted.some((text) => text.startsWith('Hello'))).toBe(true)
    // 收尾一帧补上最后一整块，不会停在中途的空白
    expect(emitted.at(-1)).toBe('你好，世界。')
  })
})
