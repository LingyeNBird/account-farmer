import type { PromptKey } from '@shared/defaults'
import { fillFeedbackDirective } from './feedback'

/** 回合生成用的系统提示词：背景规则 + 材料说明 + 条件兜底 + 终止判据。 */
export function composeSystemPrompt(
  prompts: Record<PromptKey, string>,
  forceFeedback: boolean,
  repliesSinceFeedback: number
): string {
  const parts = [prompts.system, prompts.turn]
  if (forceFeedback) {
    parts.push(fillFeedbackDirective(prompts.feedbackFallback, repliesSinceFeedback))
  }
  parts.push(prompts.termination)
  return parts.join('\n\n')
}
