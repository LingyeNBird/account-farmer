import { DEFAULT_PROMPTS, PROMPT_KEYS, type PromptKey } from '@shared/defaults'
import { promptsFile, readJson, writeJson } from './paths'

type PromptOverrides = Partial<Record<PromptKey, string>>

async function loadOverrides(): Promise<PromptOverrides> {
  const stored = await readJson<PromptOverrides>(promptsFile(), {})
  const overrides: PromptOverrides = {}
  for (const key of PROMPT_KEYS) {
    const value = stored[key]
    if (typeof value === 'string' && value.trim() && value !== DEFAULT_PROMPTS[key]) {
      overrides[key] = value
    }
  }
  return overrides
}

function merge(overrides: PromptOverrides): Record<PromptKey, string> {
  return { ...DEFAULT_PROMPTS, ...overrides }
}

export async function loadPrompts(): Promise<Record<PromptKey, string>> {
  return merge(await loadOverrides())
}

export async function savePrompt(key: PromptKey, text: string): Promise<Record<PromptKey, string>> {
  const overrides = await loadOverrides()
  if (text.trim() === DEFAULT_PROMPTS[key].trim()) {
    delete overrides[key]
  } else {
    overrides[key] = text
  }
  await writeJson(promptsFile(), overrides)
  return merge(overrides)
}

export async function resetPrompt(key: PromptKey): Promise<Record<PromptKey, string>> {
  const overrides = await loadOverrides()
  delete overrides[key]
  await writeJson(promptsFile(), overrides)
  return merge(overrides)
}
