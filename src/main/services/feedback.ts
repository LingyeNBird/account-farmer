/** 跨主题累计的反馈节奏状态，按账号保存。 */
export type FeedbackCadence = {
  /** 距上次「建议反馈」已经过去的轮数。 */
  sinceLastSuggestion: number
  /** 当前生效的间隔，取值范围为设置里的上下限。0 表示尚未抽取。 */
  interval: number
}

export const EMPTY_CADENCE: FeedbackCadence = { sinceLastSuggestion: 0, interval: 0 }

function bounds(limits: { intervalMin: number; intervalMax: number }): [number, number] {
  const low = Math.max(1, Math.floor(Math.min(limits.intervalMin, limits.intervalMax)))
  const high = Math.max(low, Math.floor(Math.max(limits.intervalMin, limits.intervalMax)))
  return [low, high]
}

export function drawInterval(
  limits: { intervalMin: number; intervalMax: number },
  random: () => number = Math.random
): number {
  const [low, high] = bounds(limits)
  const span = high - low + 1
  return low + Math.min(span - 1, Math.floor(random() * span))
}

/**
 * 推进一轮：计数加一，到间隔就给建议并重新抽间隔。
 * 反馈内容由模型每轮固定产出，这里只决定「要不要建议把它发出去」。
 */
export function nextCadence(
  cadence: FeedbackCadence,
  limits: { intervalMin: number; intervalMax: number },
  random: () => number = Math.random
): { cadence: FeedbackCadence; suggest: boolean; rounds: number } {
  const [low, high] = bounds(limits)
  const interval =
    cadence.interval >= low && cadence.interval <= high
      ? cadence.interval
      : drawInterval(limits, random)

  const rounds = cadence.sinceLastSuggestion + 1
  if (rounds >= interval) {
    return {
      cadence: { sinceLastSuggestion: 0, interval: drawInterval(limits, random) },
      suggest: true,
      rounds
    }
  }
  return { cadence: { sinceLastSuggestion: rounds, interval }, suggest: false, rounds }
}
