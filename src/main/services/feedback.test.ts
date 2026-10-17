import { describe, expect, it } from 'vitest'
import { EMPTY_CADENCE, drawInterval, nextCadence } from './feedback'

const zero = (): number => 0
const nearOne = (): number => 0.999

describe('drawInterval', () => {
  it('抽到的值落在上下限之内', () => {
    expect(drawInterval({ intervalMin: 2, intervalMax: 5 }, zero)).toBe(2)
    expect(drawInterval({ intervalMin: 2, intervalMax: 5 }, nearOne)).toBe(5)
  })

  it('上下限相等时就是固定间隔', () => {
    expect(drawInterval({ intervalMin: 3, intervalMax: 3 }, zero)).toBe(3)
    expect(drawInterval({ intervalMin: 3, intervalMax: 3 }, nearOne)).toBe(3)
  })

  it('上下限写反了也能用', () => {
    expect(drawInterval({ intervalMin: 5, intervalMax: 2 }, zero)).toBe(2)
    expect(drawInterval({ intervalMin: 5, intervalMax: 2 }, nearOne)).toBe(5)
  })
})

describe('nextCadence', () => {
  it('未到间隔时不建议反馈，并累计轮数', () => {
    const first = nextCadence(EMPTY_CADENCE, { intervalMin: 3, intervalMax: 3 }, zero)
    expect(first.suggest).toBe(false)
    expect(first.rounds).toBe(1)
    expect(first.cadence).toEqual({ sinceLastSuggestion: 1, interval: 3 })
  })

  it('到达间隔时建议反馈，并把计数清零、重新抽间隔', () => {
    let cadence = EMPTY_CADENCE
    let last = nextCadence(cadence, { intervalMin: 2, intervalMax: 2 }, zero)
    cadence = last.cadence
    expect(last.suggest).toBe(false)

    last = nextCadence(cadence, { intervalMin: 2, intervalMax: 2 }, zero)
    expect(last.suggest).toBe(true)
    expect(last.rounds).toBe(2)
    expect(last.cadence).toEqual({ sinceLastSuggestion: 0, interval: 2 })
  })

  it('建议之后计数清零，下一轮不会立刻再建议', () => {
    const limits = { intervalMin: 2, intervalMax: 2 }
    const first = nextCadence(EMPTY_CADENCE, limits, zero)
    const second = nextCadence(first.cadence, limits, zero)
    expect(second.suggest).toBe(true)

    const third = nextCadence(second.cadence, limits, zero)
    expect(third.suggest).toBe(false)
    expect(third.rounds).toBe(1)
    expect(third.cadence).toEqual({ sinceLastSuggestion: 1, interval: 2 })
  })

  it('设置改动导致旧间隔越界时重新抽取', () => {
    const res = nextCadence(
      { sinceLastSuggestion: 1, interval: 9 },
      { intervalMin: 2, intervalMax: 3 },
      zero
    )
    expect(res.cadence.interval).toBe(2)
    expect(res.suggest).toBe(false)
    expect(res.rounds).toBe(2)
  })
})
