import { IPC } from '@shared/ipc'
import { createAccount, deleteAccount, listAccounts, renameAccount, selectAccount } from '../store/accounts'
import { handle } from './handle'

export function registerAccountHandlers(): void {
  handle(IPC.accountsList, () => listAccounts())
  handle(IPC.accountsCreate, (name: string) => createAccount(name))
  handle(IPC.accountsRename, (id: string, name: string) => renameAccount(id, name))
  handle(IPC.accountsDelete, (id: string) => deleteAccount(id))
  handle(IPC.accountsSelect, (id: string) => selectAccount(id))
}
