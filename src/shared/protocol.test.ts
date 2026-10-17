import { describe, expect, it } from 'vitest'
import { ProtocolError, parseTurn, streamingText } from './protocol'

const MESSAGE = `<<<EN>>>
Sortedness only holds inside a block, so the encoder decides per block anyway.
<<</EN>>>
<<<ZH>>>
有序性只在块内成立，所以编码器本来就得逐块决定。
<<</ZH>>>
<<<FB_VERDICT>>>
good
<<</FB_VERDICT>>>
<<<FB_EN>>>
This line of argument is still on track.
<<</FB_EN>>>
<<<FB_ZH>>>
这个论证方向还在正轨上。
<<</FB_ZH>>>
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
    const parsed = parseTurn('<<<EN>>>\nA claim.\n<<</EN>>>\n<<<ZH>>>\n一个主张。\n<<</ZH>>>\n')
    expect(parsed).toEqual({ kind: 'message', en: 'A claim.', zh: '一个主张。' })
  })

  it('解析终止轮', () => {
    expect(parseTurn('<<<END>>>\n双方分歧已收敛\n<<</END>>>\n')).toEqual({
      kind: 'end',
      reason: '双方分歧已收敛'
    })
  })

  it('反馈正负值大小写容错', () => {
    const parsed = parseTurn(
      '<<<EN>>>\nA.\n<<</EN>>>\n<<<ZH>>>\n甲。\n<<</ZH>>>\n<<<FB_VERDICT>>>\n GOOD \n<<</FB_VERDICT>>>\n<<<FB_EN>>>\nok\n<<</FB_EN>>>\n<<<FB_ZH>>>\n好\n<<</FB_ZH>>>\n'
    )
    expect(parsed.kind === 'message' && parsed.feedback?.verdict).toBe('good')
  })

  it('块外的文字不影响解析', () => {
    const parsed = parseTurn(
      '先看看对方的核心分歧。\n<<<EN>>>\nA claim.\n<<</EN>>>\n<<<ZH>>>\n一个主张。\n<<</ZH>>>\n以上，本轮不建议终止。\n'
    )
    expect(parsed).toEqual({ kind: 'message', en: 'A claim.', zh: '一个主张。' })
  })

  it('缺少结束标记时报错', () => {
    expect(() => parseTurn('<<<EN>>>\nA claim.\n')).toThrow('块 EN 缺少结束标记')
  })

  it('结束标记不匹配时报错', () => {
    expect(() => parseTurn('<<<EN>>>\nA.\n<<</ZH>>>\n')).toThrow('没有对应的开始标记')
  })

  it('缺少中文对照时报错', () => {
    expect(() => parseTurn('<<<EN>>>\nA claim.\n<<</EN>>>\n')).toThrow(ProtocolError)
  })

  it('反馈三块不齐时报错', () => {
    expect(() =>
      parseTurn('<<<EN>>>\nA.\n<<</EN>>>\n<<<ZH>>>\n甲。\n<<</ZH>>>\n<<<FB_EN>>>\nonly en\n<<</FB_EN>>>\n')
    ).toThrow('反馈三块必须同时出现')
  })

  it('反馈正负值非法时报错', () => {
    expect(() =>
      parseTurn(
        '<<<EN>>>\nA.\n<<</EN>>>\n<<<ZH>>>\n甲。\n<<</ZH>>>\n<<<FB_VERDICT>>>\nmeh\n<<</FB_VERDICT>>>\n<<<FB_EN>>>\nx\n<<</FB_EN>>>\n<<<FB_ZH>>>\ny\n<<</FB_ZH>>>\n'
      )
    ).toThrow('反馈正负值不合法: meh')
  })

  it('终止优先：同轮带正文时丢弃正文', () => {
    expect(
      parseTurn('<<<EN>>>\nA.\n<<</EN>>>\n<<<ZH>>>\n甲。\n<<</ZH>>>\n<<<END>>>\n收束\n<<</END>>>\n')
    ).toEqual({ kind: 'end', reason: '收束' })
  })

  it('终止轮缺少理由时仍以终止为准', () => {
    expect(parseTurn('<<<END>>>\n<<</END>>>\n')).toEqual({ kind: 'end', reason: '' })
  })
})

describe('streamingText', () => {
  it('隐藏标记行，只显示当前正文块', () => {
    const partial = '<<<EN>>>\nSortedness only holds\n<<</EN>>>\n<<<ZH>>>\n有序性只在块内'
    expect(streamingText(partial)).toBe('有序性只在块内')
  })

  it('写入中的半截标记不显示', () => {
    expect(streamingText('<<<EN>>>\nA claim.\n<<<Z')).toBe('A claim.')
  })

  it('终止轮不显示理由', () => {
    expect(streamingText('<<<END>>>\n收束\n<<</END>>>')).toBe('')
  })
})
