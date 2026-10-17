export type Account = {
  id: string
  name: string
  createdAt: number
}

export type AccountSummary = Account & {
  topicCount: number
  archivedCount: number
  lastActiveAt: number
}

export type AccountsState = {
  accounts: AccountSummary[]
  currentAccountId: string | null
}

export type ReasoningEffort = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | null

export type ProviderSettings = {
  providerId: string
  baseUrl: string
  modelId: string
  reasoningEffort: ReasoningEffort
  contextWindow: number
  maxTokens: number
  compat: {
    supportsDeveloperRole: boolean
    supportsReasoningEffort: boolean
    supportsUsageInStreaming: boolean
  }
}

export type ProviderInfo = {
  id: string
  name: string
}

export type ModelInfo = {
  id: string
  name: string
  baseUrl: string
  reasoning: boolean
  contextWindow: number
  maxTokens: number
}

export type Settings = {
  provider: ProviderSettings
  feedback: { fallbackAfter: number }
  limits: { maxRounds: number }
  notify: { onUnfocused: boolean }
}

export const DEFAULT_SETTINGS: Settings = {
  provider: {
    providerId: '',
    baseUrl: '',
    modelId: '',
    reasoningEffort: null,
    contextWindow: 128000,
    maxTokens: 8192,
    compat: {
      supportsDeveloperRole: false,
      supportsReasoningEffort: true,
      supportsUsageInStreaming: true
    }
  },
  feedback: { fallbackAfter: 4 },
  limits: { maxRounds: 11 },
  notify: { onUnfocused: true }
}

export type TopicStatus = 'pending' | 'active' | 'archived'

export type Topic = {
  id: string
  seq: number
  batchId: string
  title: string
  domains: string[]
  openingEn: string
  openingZh: string
  status: TopicStatus
  createdAt: number
  archivedAt?: number
}

export type TopicDraft = {
  title: string
  domains: string[]
  openingEn: string
  openingZh: string
}

export type Feedback = {
  verdict: 'good' | 'bad'
  en: string
  zh: string
}

export type Turn = {
  index: number
  aiReply: string
  messageEn: string
  messageZh: string
  feedback?: Feedback
  ended: boolean
  endReason?: string
  createdAt: number
}

export type Session = {
  topicId: string
  turns: Turn[]
}
