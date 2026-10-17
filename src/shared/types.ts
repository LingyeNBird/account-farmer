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
  feedback: { intervalMin: number; intervalMax: number }
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
  feedback: { intervalMin: 2, intervalMax: 5 },
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
  /** 本轮建议把反馈发给对方；由程序按随机间隔判定，与模型无关。 */
  suggestFeedback?: boolean
  /** 距上次建议反馈经过的轮数，仅在不建议时使用。 */
  roundsSinceSuggestion?: number
  ended: boolean
  endReason?: string
  createdAt: number
}

export type Session = {
  topicId: string
  turns: Turn[]
}
