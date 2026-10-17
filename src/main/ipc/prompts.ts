import { IPC } from '@shared/ipc'
import type { PromptKey } from '@shared/defaults'
import { loadPrompts, resetPrompt, savePrompt } from '../store/prompts'
import { handle } from './handle'

export function registerPromptHandlers(): void {
  handle(IPC.promptsGet, () => loadPrompts())
  handle(IPC.promptsSave, (key: PromptKey, text: string) => savePrompt(key, text))
  handle(IPC.promptsReset, (key: PromptKey) => resetPrompt(key))
}
