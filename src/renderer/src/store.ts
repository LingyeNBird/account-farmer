import { create } from 'zustand'
import type { TopicProgress } from '@shared/ipc'
import { SESSION_VERSION } from '@shared/types'
import type { AccountSummary, Session, Settings, Topic } from '@shared/types'
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
  selectedTopicId: string | null
  session: Session | null
  turnStreaming: string | null
  turnLoading: boolean
  refilling: boolean
  generating: TopicProgress | null
  error: string | null
  clearError: () => void
  setGenerating: (progress: TopicProgress | null) => void
  refreshAccounts: () => Promise<void>
  refreshSettings: () => Promise<void>
  saveSettings: (settings: Settings, apiKey: string) => Promise<void>
  loadTopics: () => Promise<void>
  selectTopic: (id: string) => Promise<void>
  setTurnStreaming: (text: string | null) => void
  setRefilling: (value: boolean) => void
  refillTopics: () => Promise<void>
  cancelRefill: () => Promise<void>
  generateTurn: (reply: string) => Promise<void>
  endTopic: () => Promise<void>
  activateTopic: (topicId: string) => Promise<void>
  deleteTopic: (topicId: string) => Promise<void>
  updateTopicOpening: (topicId: string, openingEn: string, openingZh: string) => Promise<void>
  abortTurn: () => Promise<void>
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
  selectedTopicId: null,
  session: null,
  turnStreaming: null,
  turnLoading: false,
  refilling: false,
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
      async () => {
        const topics = await api.listTopics(accountId)
        const selected = get().selectedTopicId
        const keep = selected && topics.some((topic) => topic.id === selected)
        const fallback = topics.find((topic) => topic.status === 'active') ?? topics[0]
        const next = keep ? selected : (fallback?.id ?? null)
        set({ topics, topicsLoadedFor: accountId, selectedTopicId: next })
        if (next) await get().selectTopic(next)
        else set({ session: null })
        if (topics.length > 0 && !topics.some((topic) => topic.status === 'pending')) {
          await api.refillTopics(accountId)
        }
      },
      (message) => set({ error: message })
    )
  },

  selectTopic: async (id) => {
    const accountId = get().currentAccountId
    set({ selectedTopicId: id, session: null, turnStreaming: null })
    if (!accountId) return
    await guard(
      async () => set({ session: await api.getSession(accountId, id) }),
      (message) => set({ error: message })
    )
  },

  setTurnStreaming: (text) => set({ turnStreaming: text }),

  setRefilling: (value) => set({ refilling: value }),

  refillTopics: async () => {
    const accountId = get().currentAccountId
    if (!accountId) return
    await guard(
      async () => {
        set({ refilling: true })
        await api.refillTopics(accountId)
      },
      (message) => set({ error: message })
    )
  },

  cancelRefill: async () => {
    const accountId = get().currentAccountId
    if (!accountId) return
    await guard(
      () => api.cancelRefill(accountId),
      (message) => set({ error: message })
    )
  },

  generateTurn: async (reply) => {
    const accountId = get().currentAccountId
    const topicId = get().selectedTopicId
    if (!accountId || !topicId) return
    set({ turnLoading: true, turnStreaming: '', error: null })
    try {
      const turn = await api.generateTurn(accountId, topicId, reply)
      const base: Session = get().session ?? { topicId, version: SESSION_VERSION, turns: [] }
      // 粘贴的回复属于上一条发言：没有轮次时挂在开场，否则挂在最后一轮。
      const withReply: Session =
        base.turns.length === 0
          ? { ...base, openingReply: reply, turns: [turn] }
          : {
              ...base,
              turns: [
                ...base.turns.map((item, index) =>
                  index === base.turns.length - 1 ? { ...item, reply } : item
                ),
                turn
              ]
            }
      set({ session: withReply })
      if (turn.ended) {
        const topics = await api.listTopics(accountId)
        const next = topics.find((topic) => topic.status === 'active') ?? topics[0]
        set({ topics, selectedTopicId: next?.id ?? null, session: null })
        if (next) await get().selectTopic(next.id)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message !== '已取消') set({ error: message })
    } finally {
      set({ turnLoading: false, turnStreaming: null })
    }
  },

  endTopic: async () => {
    const accountId = get().currentAccountId
    const topicId = get().selectedTopicId
    if (!accountId || !topicId) return
    await guard(async () => {
      const topics = await api.archiveTopic(accountId, topicId)
      const next = topics.find((topic) => topic.status === 'active') ?? topics[0]
      set({ topics, selectedTopicId: next?.id ?? null, session: null })
      if (next) await get().selectTopic(next.id)
    }, (message) => set({ error: message }))
  },

  activateTopic: async (topicId) => {
    const accountId = get().currentAccountId
    if (!accountId) return
    await guard(
      async () => set({ topics: await api.activateTopic(accountId, topicId) }),
      (message) => set({ error: message })
    )
  },

  deleteTopic: async (topicId) => {
    const accountId = get().currentAccountId
    if (!accountId) return
    await guard(
      async () => {
        const topics = await api.deleteTopic(accountId, topicId)
        const wasSelected = get().selectedTopicId === topicId
        const next = topics.find((topic) => topic.status === 'active') ?? topics[0]
        set({ topics })
        if (wasSelected) {
          set({ selectedTopicId: next?.id ?? null, session: null })
          if (next) await get().selectTopic(next.id)
        }
      },
      (message) => set({ error: message })
    )
  },

  updateTopicOpening: async (topicId, openingEn, openingZh) => {
    const accountId = get().currentAccountId
    if (!accountId) return
    await guard(
      async () =>
        set({ topics: await api.updateTopicOpening(accountId, topicId, openingEn, openingZh) }),
      (message) => set({ error: message })
    )
  },

  abortTurn: async () => {
    const accountId = get().currentAccountId
    const topicId = get().selectedTopicId
    if (accountId && topicId) await api.abortTurn(accountId, topicId)
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
