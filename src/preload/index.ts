import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type Api } from '@shared/ipc'

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
  listModels: (providerId) => ipcRenderer.invoke(IPC.llmModels, providerId)
}

contextBridge.exposeInMainWorld('api', api)
