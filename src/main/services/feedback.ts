import type { Turn } from '@shared/types'

/** 连续多少轮没有反馈，从最新一轮往前数。 */
export function countRepliesSinceFeedback(turns: Turn[]): number {
  let count = 0
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    if (turns[index].feedback) break
    count += 1
  }
  return count
}

export function fillFeedbackDirective(template: string, repliesSinceFeedback: number): string {
  return template.replaceAll('{{replies_since_feedback}}', String(repliesSinceFeedback))
}
