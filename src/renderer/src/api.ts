import type { IpcResult, PromptMap, RefillFocus, RefillState, TopicProgress, TurnDelta } from '@shared/ipc'
import type { PromptKey } from '@shared/defaults'
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
  archiveTopic: (accountId: string, topicId: string): Promise<Topic[]> =>
    unwrap(window.api.archiveTopic(accountId, topicId)),
  activateTopic: (accountId: string, topicId: string): Promise<Topic[]> =>
    unwrap(window.api.activateTopic(accountId, topicId)),
  deleteTopic: (accountId: string, topicId: string): Promise<Topic[]> =>
    unwrap(window.api.deleteTopic(accountId, topicId)),
  updateTopicOpening: (
    accountId: string,
    topicId: string,
    openingEn: string,
    openingZh: string
  ): Promise<Topic[]> =>
    unwrap(window.api.updateTopicOpening(accountId, topicId, openingEn, openingZh)),
  refillTopics: (accountId: string): Promise<void> => unwrap(window.api.refillTopics(accountId)),
  cancelRefill: (accountId: string): Promise<void> => unwrap(window.api.cancelRefill(accountId)),
  onRefillState: (handler: (state: RefillState) => void): (() => void) =>
    window.api.onRefillState(handler),
  onRefillFocus: (handler: (payload: RefillFocus) => void): (() => void) =>
    window.api.onRefillFocus(handler),
  getPrompts: (): Promise<PromptMap> => unwrap(window.api.getPrompts()),
  savePrompt: (key: PromptKey, text: string): Promise<PromptMap> =>
    unwrap(window.api.savePrompt(key, text)),
  resetPrompt: (key: PromptKey): Promise<PromptMap> => unwrap(window.api.resetPrompt(key)),
  onTopicProgress: (handler: (progress: TopicProgress) => void): (() => void) =>
    window.api.onTopicProgress(handler),
  getSession: (accountId: string, topicId: string): Promise<Session> =>
    unwrap(window.api.getSession(accountId, topicId)),
  generateTurn: (accountId: string, topicId: string, reply: string): Promise<Turn> =>
    unwrap(window.api.generateTurn(accountId, topicId, reply)),
  abortTurn: (accountId: string, topicId: string): Promise<void> =>
    unwrap(window.api.abortTurn(accountId, topicId)),
  onTurnDelta: (handler: (delta: TurnDelta) => void): (() => void) => window.api.onTurnDelta(handler),
  copyText: (text: string): Promise<void> => unwrap(window.api.copyText(text))
}
