import type { PromptKey } from './defaults'
import type {
  AccountsState,
  AccountSummary,
  ModelInfo,
  ProviderInfo,
  ProviderSettings,
  Session,
  Settings,
  Topic,
  Turn
} from './types'

export type IpcResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string }

export type PromptMap = Record<PromptKey, string>

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
  llmModels: 'llm:models',
  topicsList: 'topics:list',
  topicsGenerate: 'topics:generate',
  topicsCancel: 'topics:cancel',
  topicsArchive: 'topics:archive',
  topicsActivate: 'topics:activate',
  topicsDelete: 'topics:delete',
  topicsUpdateOpening: 'topics:update-opening',
  topicsRefill: 'topics:refill',
  refillState: 'topics:refill-state',
  refillFocus: 'topics:refill-focus',
  promptsGet: 'prompts:get',
  promptsSave: 'prompts:save',
  promptsReset: 'prompts:reset',
  topicsProgress: 'topics:progress',
  sessionGet: 'session:get',
  sessionGenerate: 'session:generate',
  sessionAbort: 'session:abort',
  sessionDelta: 'session:delta',
  clipboardWrite: 'clipboard:write'
} as const

export type TurnDelta = {
  accountId: string
  topicId: string
  text: string
}

export type RefillState = {
  accountId: string
  state: 'running' | 'done' | 'failed'
}

export type RefillFocus = {
  accountId: string
}

export type TopicProgress = {
  accountId: string
  generated: number
  total: number
  titles: string[]
}

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
  listTopics: (accountId: string) => Promise<IpcResult<Topic[]>>
  generateTopics: (accountId: string) => Promise<IpcResult<Topic[]>>
  cancelTopicGeneration: (accountId: string) => Promise<IpcResult<void>>
  archiveTopic: (accountId: string, topicId: string) => Promise<IpcResult<Topic[]>>
  activateTopic: (accountId: string, topicId: string) => Promise<IpcResult<Topic[]>>
  deleteTopic: (accountId: string, topicId: string) => Promise<IpcResult<Topic[]>>
  updateTopicOpening: (
    accountId: string,
    topicId: string,
    openingEn: string,
    openingZh: string
  ) => Promise<IpcResult<Topic[]>>
  refillTopics: (accountId: string) => Promise<IpcResult<void>>
  onRefillState: (handler: (state: RefillState) => void) => () => void
  onRefillFocus: (handler: (payload: RefillFocus) => void) => () => void
  getPrompts: () => Promise<IpcResult<PromptMap>>
  savePrompt: (key: PromptKey, text: string) => Promise<IpcResult<PromptMap>>
  resetPrompt: (key: PromptKey) => Promise<IpcResult<PromptMap>>
  onTopicProgress: (handler: (progress: TopicProgress) => void) => () => void
  getSession: (accountId: string, topicId: string) => Promise<IpcResult<Session>>
  generateTurn: (accountId: string, topicId: string, aiReply: string) => Promise<IpcResult<Turn>>
  abortTurn: (accountId: string, topicId: string) => Promise<IpcResult<void>>
  onTurnDelta: (handler: (delta: TurnDelta) => void) => () => void
  copyText: (text: string) => Promise<IpcResult<void>>
}
