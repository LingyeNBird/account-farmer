import { IPC } from '@shared/ipc'
import type { ProviderSettings, Settings } from '@shared/types'
import { listModels, listProviders, testConnection } from '../services/llm'
import { clearApiKey, getApiKey, hasApiKey, setApiKey } from '../store/secrets'
import { loadSettings, saveSettings } from '../store/settings'
import { handle } from './handle'

export function registerSettingsHandlers(): void {
  handle(IPC.settingsGet, () => loadSettings())
  handle(IPC.settingsSave, (settings: Settings) => saveSettings(settings))
  handle(IPC.settingsKeyStatus, () => hasApiKey())
  handle(IPC.settingsKeySet, async (key: string) => setApiKey(key))
  handle(IPC.settingsKeyClear, async () => clearApiKey())
  handle(IPC.settingsTest, async (provider: ProviderSettings, apiKey: string) => {
    const stored = apiKey || (await getApiKey())
    if (!stored) throw new Error('缺少 API Key')
    return testConnection(provider, stored)
  })
  handle(IPC.llmProviders, async () => listProviders())
  handle(IPC.llmModels, async (providerId: string) => listModels(providerId))
}
