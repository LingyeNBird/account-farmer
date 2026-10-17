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

function seeded(seed: number): () => number {
  let value = seed
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648
    return value / 2147483648
  }
}

function runRounds(
  rounds: number,
  limits: { intervalMin: number; intervalMax: number },
  random: () => number
): number[] {
  let cadence = EMPTY_CADENCE
  const suggestedAt: number[] = []
  for (let round = 1; round <= rounds; round += 1) {
    const result = nextCadence(cadence, limits, random)
    cadence = result.cadence
    if (result.suggest) suggestedAt.push(round)
  }
  return suggestedAt
}

describe('长期节奏', () => {
  it('每次建议之间的间隔都落在上下限内', () => {
    const suggested = runRounds(200, { intervalMin: 2, intervalMax: 5 }, seeded(7))
    expect(suggested.length).toBeGreaterThan(20)

    let previous = 0
    for (const round of suggested) {
      const gap = round - previous
      expect(gap).toBeGreaterThanOrEqual(2)
      expect(gap).toBeLessThanOrEqual(5)
      previous = round
    }
  })

  it('上下限相等时严格每 N 轮建议一次', () => {
    const suggested = runRounds(30, { intervalMin: 3, intervalMax: 3 }, seeded(1))
    expect(suggested).toEqual([3, 6, 9, 12, 15, 18, 21, 24, 27, 30])
  })

  it('随机数取边界值也不越界', () => {
    const lows = runRounds(40, { intervalMin: 2, intervalMax: 5 }, () => 0)
    const highs = runRounds(40, { intervalMin: 2, intervalMax: 5 }, () => 1)
    expect(lows).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40])
    expect(highs).toEqual([5, 10, 15, 20, 25, 30, 35, 40])
  })
})
