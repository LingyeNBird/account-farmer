import { create } from 'zustand'
import type { TopicProgress } from '@shared/ipc'
import type { AccountSummary, Settings, Topic } from '@shared/types'
import { api } from './api'

export type View = 'workbench' | 'accounts' | 'settings' | 'prompts'

type AppState = {
  view: View
  setView: (view: View) => void
  accounts: AccountSummary[]
  currentAccountId: string | null
  settings: Settings | null
  hasKey: boolean
  topics: Topic[]
  topicsLoadedFor: string | null
  generating: TopicProgress | null
  error: string | null
  clearError: () => void
  setGenerating: (progress: TopicProgress | null) => void
  refreshAccounts: () => Promise<void>
  refreshSettings: () => Promise<void>
  saveSettings: (settings: Settings, apiKey: string) => Promise<void>
  loadTopics: () => Promise<void>
  generateTopics: () => Promise<void>
  cancelTopicGeneration: () => Promise<void>
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
  hasKey: false,
  topics: [],
  topicsLoadedFor: null,
  generating: null,
  error: null,
  clearError: () => set({ error: null }),
  setGenerating: (generating) => set({ generating }),

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
      async () => {
        const [settings, hasKey] = await Promise.all([api.getSettings(), api.hasApiKey()])
        set({ settings, hasKey })
      },
      (message) => set({ error: message })
    )
  },

  saveSettings: async (settings, apiKey) => {
    await guard(
      async () => {
        if (apiKey) await api.setApiKey(apiKey)
        const saved = await api.saveSettings(settings)
        const keyPresent = await api.hasApiKey()
        set({ settings: saved, hasKey: keyPresent })
      },
      (message) => set({ error: message })
    )
  },

  loadTopics: async () => {
    const accountId = get().currentAccountId
    if (!accountId) {
      set({ topics: [], topicsLoadedFor: null })
      return
    }
    await guard(
      async () => set({ topics: await api.listTopics(accountId), topicsLoadedFor: accountId }),
      (message) => set({ error: message })
    )
  },

  generateTopics: async () => {
    const accountId = get().currentAccountId
    if (!accountId) return
    set({
      generating: { accountId, generated: 0, total: 12, titles: [] },
      error: null
    })
    try {
      const topics = await api.generateTopics(accountId)
      set({ topics, generating: null })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      set({ generating: null, ...(message === '已取消' ? {} : { error: message }) })
    }
  },

  cancelTopicGeneration: async () => {
    const accountId = get().currentAccountId
    if (!accountId) return
    await api.cancelTopicGeneration(accountId)
  },

  createAccount: async (name) => {
    await guard(async () => {
      await api.createAccount(name)
      await get().refreshAccounts()
      await get().loadTopics()
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
      await get().loadTopics()
    }, (message) => set({ error: message }))
  },

  selectAccount: async (id) => {
    await guard(async () => {
      await api.selectAccount(id)
      await get().refreshAccounts()
      await get().loadTopics()
    }, (message) => set({ error: message }))
  }
}))
