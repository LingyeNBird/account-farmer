import { DEFAULT_PROMPTS, PROMPT_KEYS, type PromptKey } from '@shared/defaults'
import { readJson, promptsFile } from './paths'

export async function loadPrompts(): Promise<Record<PromptKey, string>> {
  const stored = await readJson<Partial<Record<PromptKey, string>>>(promptsFile(), {})
  const result = { ...DEFAULT_PROMPTS }
  for (const key of PROMPT_KEYS) {
    const value = stored[key]
    if (typeof value === 'string' && value.trim()) result[key] = value
  }
  return result
}
