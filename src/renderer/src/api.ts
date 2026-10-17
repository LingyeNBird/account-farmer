import type { IpcResult } from '@shared/ipc'
import type { AccountsState, AccountSummary, Settings } from '@shared/types'

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
  getSettings: (): Promise<Settings> => unwrap(window.api.getSettings())
}
