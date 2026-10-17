import { create } from 'zustand'
import type { AccountSummary, Settings } from '@shared/types'
import { api } from './api'

export type View = 'workbench' | 'accounts' | 'settings' | 'prompts'

type AppState = {
  view: View
  setView: (view: View) => void
  accounts: AccountSummary[]
  currentAccountId: string | null
  settings: Settings | null
  error: string | null
  clearError: () => void
  refreshAccounts: () => Promise<void>
  refreshSettings: () => Promise<void>
  createAccount: (name: string) => Promise<void>
  renameAccount: (id: string, name: string) => Promise<void>
  deleteAccount: (id: string) => Promise<void>
  selectAccount: (id: string) => Promise<void>
}

async function guard<T>(run: () => Promise<T>, onError: (message: string) => void): Promise<void> {
  try {
    await run()
  } catch (error) {
    onError(error instanceof Error ? error.message : String(error))
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  view: 'workbench',
  setView: (view) => set({ view, error: null }),
  accounts: [],
  currentAccountId: null,
  settings: null,
  error: null,
  clearError: () => set({ error: null }),

  refreshAccounts: async () => {
    await guard(
      async () => {
        const state = await api.listAccounts()
        set({ accounts: state.accounts, currentAccountId: state.currentAccountId })
      },
      (message) => set({ error: message })
    )
  },

  refreshSettings: async () => {
    await guard(
      async () => set({ settings: await api.getSettings() }),
      (message) => set({ error: message })
    )
  },

  createAccount: async (name) => {
    await guard(async () => {
      await api.createAccount(name)
      await get().refreshAccounts()
    }, (message) => set({ error: message }))
  },

  renameAccount: async (id, name) => {
    await guard(async () => {
      await api.renameAccount(id, name)
      await get().refreshAccounts()
    }, (message) => set({ error: message }))
  },

  deleteAccount: async (id) => {
    await guard(async () => {
      await api.deleteAccount(id)
      await get().refreshAccounts()
    }, (message) => set({ error: message }))
  },

  selectAccount: async (id) => {
    await guard(async () => {
      await api.selectAccount(id)
      await get().refreshAccounts()
    }, (message) => set({ error: message }))
  }
}))
