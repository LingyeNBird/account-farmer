import { describe, expect, it } from 'vitest'
import { ProtocolError, parseTurn, streamingText } from './protocol'

const MESSAGE = `<<<EN>>>
Sortedness only holds inside a block, so the encoder decides per block anyway.
<<<ZH>>>
有序性只在块内成立，所以编码器本来就得逐块决定。
<<<FB_VERDICT>>>
good
<<<FB_EN>>>
This line of argument is still on track.
<<<FB_ZH>>>
这个论证方向还在正轨上。
`

describe('parseTurn', () => {
  it('解析带反馈的普通轮', () => {
    expect(parseTurn(MESSAGE)).toEqual({
      kind: 'message',
      en: 'Sortedness only holds inside a block, so the encoder decides per block anyway.',
      zh: '有序性只在块内成立，所以编码器本来就得逐块决定。',
      feedback: {
        verdict: 'good',
        en: 'This line of argument is still on track.',
        zh: '这个论证方向还在正轨上。'
      }
    })
  })

  it('解析不带反馈的普通轮', () => {
    const parsed = parseTurn('<<<EN>>>\nA claim.\n<<<ZH>>>\n一个主张。\n')
    expect(parsed).toEqual({ kind: 'message', en: 'A claim.', zh: '一个主张。' })
  })

  it('解析终止轮', () => {
    expect(parseTurn('<<<END>>>\n双方分歧已收敛\n')).toEqual({
      kind: 'end',
      reason: '双方分歧已收敛'
    })
  })

  it('反馈正负值大小写容错', () => {
    const parsed = parseTurn(
      '<<<EN>>>\nA.\n<<<ZH>>>\n甲。\n<<<FB_VERDICT>>>\n GOOD \n<<<FB_EN>>>\nok\n<<<FB_ZH>>>\n好\n'
    )
    expect(parsed.kind === 'message' && parsed.feedback?.verdict).toBe('good')
  })

  it('缺少中文对照时报错', () => {
    expect(() => parseTurn('<<<EN>>>\nA claim.\n')).toThrow(ProtocolError)
  })

  it('反馈三块不齐时报错', () => {
    expect(() => parseTurn('<<<EN>>>\nA.\n<<<ZH>>>\n甲。\n<<<FB_EN>>>\nonly en\n')).toThrow(
      '反馈三块必须同时出现'
    )
  })

  it('反馈正负值非法时报错', () => {
    expect(() =>
      parseTurn('<<<EN>>>\nA.\n<<<ZH>>>\n甲。\n<<<FB_VERDICT>>>\nmeh\n<<<FB_EN>>>\nx\n<<<FB_ZH>>>\ny\n')
    ).toThrow('反馈正负值不合法: meh')
  })

  it('终止轮带正文时丢弃正文', () => {
    expect(parseTurn('<<<EN>>>\nA.\n<<<ZH>>>\n甲。\n<<<END>>>\n收束\n')).toEqual({
      kind: 'end',
      reason: '收束'
    })
  })

  it('终止轮缺少理由时仍以终止为准', () => {
    expect(parseTurn('<<<END>>>\n')).toEqual({ kind: 'end', reason: '' })
  })
})

describe('streamingText', () => {
  it('隐藏标记行，只显示当前正文块', () => {
    const partial = '<<<EN>>>\nSortedness only holds\n<<<ZH>>>\n有序性只在块内'
    expect(streamingText(partial)).toBe('有序性只在块内')
  })

  it('写入中的半截标记不显示', () => {
    expect(streamingText('<<<EN>>>\nA claim.\n<<<Z')).toBe('A claim.')
  })

  it('终止轮不显示理由之外的正文', () => {
    expect(streamingText('<<<END>>>\n收束')).toBe('')
  })
})
