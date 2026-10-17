import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type Api, type TopicProgress, type TurnDelta } from '@shared/ipc'

const api: Api = {
  listAccounts: () => ipcRenderer.invoke(IPC.accountsList),
  createAccount: (name) => ipcRenderer.invoke(IPC.accountsCreate, name),
  renameAccount: (id, name) => ipcRenderer.invoke(IPC.accountsRename, id, name),
  deleteAccount: (id) => ipcRenderer.invoke(IPC.accountsDelete, id),
  selectAccount: (id) => ipcRenderer.invoke(IPC.accountsSelect, id),
  getSettings: () => ipcRenderer.invoke(IPC.settingsGet),
  saveSettings: (settings) => ipcRenderer.invoke(IPC.settingsSave, settings),
  hasApiKey: () => ipcRenderer.invoke(IPC.settingsKeyStatus),
  setApiKey: (key) => ipcRenderer.invoke(IPC.settingsKeySet, key),
  clearApiKey: () => ipcRenderer.invoke(IPC.settingsKeyClear),
  testConnection: (provider, apiKey) => ipcRenderer.invoke(IPC.settingsTest, provider, apiKey),
  listProviders: () => ipcRenderer.invoke(IPC.llmProviders),
  listModels: (providerId) => ipcRenderer.invoke(IPC.llmModels, providerId),
  listTopics: (accountId) => ipcRenderer.invoke(IPC.topicsList, accountId),
  generateTopics: (accountId) => ipcRenderer.invoke(IPC.topicsGenerate, accountId),
  cancelTopicGeneration: (accountId) => ipcRenderer.invoke(IPC.topicsCancel, accountId),
  onTopicProgress: (handler) => {
    const listener = (_event: unknown, progress: TopicProgress): void => handler(progress)
    ipcRenderer.on(IPC.topicsProgress, listener)
    return () => {
      ipcRenderer.removeListener(IPC.topicsProgress, listener)
    }
  },
  getSession: (accountId, topicId) => ipcRenderer.invoke(IPC.sessionGet, accountId, topicId),
  generateTurn: (accountId, topicId, aiReply) =>
    ipcRenderer.invoke(IPC.sessionGenerate, accountId, topicId, aiReply),
  abortTurn: (accountId, topicId) => ipcRenderer.invoke(IPC.sessionAbort, accountId, topicId),
  onTurnDelta: (handler) => {
    const listener = (_event: unknown, delta: TurnDelta): void => handler(delta)
    ipcRenderer.on(IPC.sessionDelta, listener)
    return () => {
      ipcRenderer.removeListener(IPC.sessionDelta, listener)
    }
  },
  copyText: (text) => ipcRenderer.invoke(IPC.clipboardWrite, text)
}

contextBridge.exposeInMainWorld('api', api)
