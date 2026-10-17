import type {
  AccountsState,
  AccountSummary,
  ModelInfo,
  ProviderInfo,
  ProviderSettings,
  Settings
} from './types'

export type IpcResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string }

export const IPC = {
  accountsList: 'accounts:list',
  accountsCreate: 'accounts:create',
  accountsRename: 'accounts:rename',
  accountsDelete: 'accounts:delete',
  accountsSelect: 'accounts:select',
  settingsGet: 'settings:get',
  settingsSave: 'settings:save',
  settingsKeyStatus: 'settings:key-status',
  settingsKeySet: 'settings:key-set',
  settingsKeyClear: 'settings:key-clear',
  settingsTest: 'settings:test',
  llmProviders: 'llm:providers',
  llmModels: 'llm:models'
} as const

export type Api = {
  listAccounts: () => Promise<IpcResult<AccountsState>>
  createAccount: (name: string) => Promise<IpcResult<AccountSummary>>
  renameAccount: (id: string, name: string) => Promise<IpcResult<AccountSummary>>
  deleteAccount: (id: string) => Promise<IpcResult<void>>
  selectAccount: (id: string) => Promise<IpcResult<void>>
  getSettings: () => Promise<IpcResult<Settings>>
  saveSettings: (settings: Settings) => Promise<IpcResult<Settings>>
  hasApiKey: () => Promise<IpcResult<boolean>>
  setApiKey: (key: string) => Promise<IpcResult<void>>
  clearApiKey: () => Promise<IpcResult<void>>
  testConnection: (provider: ProviderSettings, apiKey: string) => Promise<IpcResult<string>>
  listProviders: () => Promise<IpcResult<ProviderInfo[]>>
  listModels: (providerId: string) => Promise<IpcResult<ModelInfo[]>>
}
