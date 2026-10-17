import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type Api } from '@shared/ipc'

const api: Api = {
  listAccounts: () => ipcRenderer.invoke(IPC.accountsList),
  createAccount: (name) => ipcRenderer.invoke(IPC.accountsCreate, name),
  renameAccount: (id, name) => ipcRenderer.invoke(IPC.accountsRename, id, name),
  deleteAccount: (id) => ipcRenderer.invoke(IPC.accountsDelete, id),
  selectAccount: (id) => ipcRenderer.invoke(IPC.accountsSelect, id),
  getSettings: () => ipcRenderer.invoke(IPC.settingsGet)
}

contextBridge.exposeInMainWorld('api', api)
