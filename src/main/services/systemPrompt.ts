import type { PromptKey } from '@shared/defaults'

/** 回合生成用的系统提示词：背景规则 + 材料说明 + 终止判据。 */
export function composeSystemPrompt(prompts: Record<PromptKey, string>): string {
  return [prompts.system, prompts.turn, prompts.termination].join('\n\n')
}
