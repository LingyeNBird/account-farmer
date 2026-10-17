import type { IpcResult, TopicProgress } from '@shared/ipc'
import type {
  AccountsState,
  AccountSummary,
  ModelInfo,
  ProviderInfo,
  ProviderSettings,
  Settings,
  Topic
} from '@shared/types'

async function unwrap<T>(result: Promise<IpcResult<T>>): Promise<T> {
  const value = await result
  if (!value.ok) throw new Error(value.message)
  return value.data
}

export const api = {
  listAccounts: (): Promise<AccountsState> => unwrap(window.api.listAccounts()),
  createAccount: (name: string): Promise<AccountSummary> => unwrap(window.api.createAccount(name)),
  renameAccount: (id: string, name: string): Promise<AccountSummary> =>
    unwrap(window.api.renameAccount(id, name)),
  deleteAccount: (id: string): Promise<void> => unwrap(window.api.deleteAccount(id)),
  selectAccount: (id: string): Promise<void> => unwrap(window.api.selectAccount(id)),
  getSettings: (): Promise<Settings> => unwrap(window.api.getSettings()),
  saveSettings: (settings: Settings): Promise<Settings> => unwrap(window.api.saveSettings(settings)),
  hasApiKey: (): Promise<boolean> => unwrap(window.api.hasApiKey()),
  setApiKey: (key: string): Promise<void> => unwrap(window.api.setApiKey(key)),
  clearApiKey: (): Promise<void> => unwrap(window.api.clearApiKey()),
  testConnection: (provider: ProviderSettings, apiKey: string): Promise<string> =>
    unwrap(window.api.testConnection(provider, apiKey)),
  listProviders: (): Promise<ProviderInfo[]> => unwrap(window.api.listProviders()),
  listModels: (providerId: string): Promise<ModelInfo[]> => unwrap(window.api.listModels(providerId)),
  listTopics: (accountId: string): Promise<Topic[]> => unwrap(window.api.listTopics(accountId)),
  generateTopics: (accountId: string): Promise<Topic[]> => unwrap(window.api.generateTopics(accountId)),
  cancelTopicGeneration: (accountId: string): Promise<void> =>
    unwrap(window.api.cancelTopicGeneration(accountId)),
  onTopicProgress: (handler: (progress: TopicProgress) => void): (() => void) =>
    window.api.onTopicProgress(handler)
}
