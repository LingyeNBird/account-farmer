import type { AccountsState, AccountSummary, Settings } from './types'

export type IpcResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string }

export const IPC = {
  accountsList: 'accounts:list',
  accountsCreate: 'accounts:create',
  accountsRename: 'accounts:rename',
  accountsDelete: 'accounts:delete',
  accountsSelect: 'accounts:select',
  settingsGet: 'settings:get'
} as const

export type Api = {
  listAccounts: () => Promise<IpcResult<AccountsState>>
  createAccount: (name: string) => Promise<IpcResult<AccountSummary>>
  renameAccount: (id: string, name: string) => Promise<IpcResult<AccountSummary>>
  deleteAccount: (id: string) => Promise<IpcResult<void>>
  selectAccount: (id: string) => Promise<IpcResult<void>>
  getSettings: () => Promise<IpcResult<Settings>>
}
