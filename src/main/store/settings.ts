import { DEFAULT_SETTINGS, type Settings } from '@shared/types'
import { readJson, settingsFile, writeJson } from './paths'

export async function loadSettings(): Promise<Settings> {
  const stored = await readJson<Partial<Settings>>(settingsFile(), {})
  return {
    provider: {
      ...DEFAULT_SETTINGS.provider,
      ...stored.provider,
      compat: { ...DEFAULT_SETTINGS.provider.compat, ...stored.provider?.compat }
    },
    feedback: { ...DEFAULT_SETTINGS.feedback, ...stored.feedback },
    notify: { ...DEFAULT_SETTINGS.notify, ...stored.notify }
  }
}

export async function saveSettings(next: Settings): Promise<Settings> {
  await writeJson(settingsFile(), next)
  return next
}
