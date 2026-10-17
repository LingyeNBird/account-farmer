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

export type TurnDebug = {
  systemPrompt: string
  userMessage: string
  rawReply: string
  exampleCount: number
  exampleChars: number
  usage: {
    input: number
    output: number
    cacheRead: number
    cacheWrite: number
    totalTokens: number
  }
  params: {
    provider: string
    model: string
    reasoning: string | null
    maxTokens: number
  }
}

export type Turn = {
  index: number
  messageEn: string
  messageZh: string
  feedback?: Feedback
  /** 对方对我这条发言的回复，用户粘贴后写入。 */
  reply?: string
  ended: boolean
  endReason?: string
  /** 本次请求的提示词、参数与原始输出，仅用于排查。 */
  debug?: TurnDebug
  createdAt: number
}

/** 会话文件格式版本。1 = 旧结构（turn 里存 aiReply），2 = 我的发言 + 对方回复。 */
export const SESSION_VERSION = 2

export type Session = {
  topicId: string
  version: number
  /** 对方对我方开场白的回复。 */
  openingReply?: string
  turns: Turn[]
}
