import { DEFAULT_SETTINGS, type Settings } from '@shared/types'
import { readJson, settingsFile } from './paths'

export async function loadSettings(): Promise<Settings> {
  const stored = await readJson<Partial<Settings>>(settingsFile(), {})
  return {
    provider: {
      ...DEFAULT_SETTINGS.provider,
      ...stored.provider,
      compat: { ...DEFAULT_SETTINGS.provider.compat, ...stored.provider?.compat }
    },
    feedback: { ...DEFAULT_SETTINGS.feedback, ...stored.feedback },
    context: { ...DEFAULT_SETTINGS.context, ...stored.context },
    notify: { ...DEFAULT_SETTINGS.notify, ...stored.notify }
  }
}
