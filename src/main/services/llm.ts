import type { Api, KnownProvider, Model } from '@mariozechner/pi-ai'
import type { ModelInfo, ProviderInfo, ProviderSettings } from '@shared/types'

// pi-ai 只提供 ESM 入口，主进程是 CJS，必须走动态 import。
const loadPiAi = () => import('@mariozechner/pi-ai')

export async function listProviders(): Promise<ProviderInfo[]> {
  const { getProviders } = await loadPiAi()
  return getProviders().map((id) => ({ id, name: id }))
}

export async function listModels(providerId: string): Promise<ModelInfo[]> {
  if (!providerId || providerId === 'custom') return []
  const { getModels } = await loadPiAi()
  return getModels(providerId as KnownProvider).map((model) => ({
    id: model.id,
    name: model.name,
    baseUrl: model.baseUrl,
    reasoning: model.reasoning,
    contextWindow: model.contextWindow,
    maxTokens: model.maxTokens
  }))
}

export async function buildModel(provider: ProviderSettings): Promise<Model<Api>> {
  if (provider.providerId === 'custom') {
    return {
      id: provider.modelId,
      name: provider.modelId,
      api: 'openai-completions',
      provider: 'custom',
      baseUrl: provider.baseUrl,
      reasoning: provider.reasoningEffort !== null && provider.reasoningEffort !== 'off',
      input: ['text'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: provider.contextWindow,
      maxTokens: provider.maxTokens,
      compat: {
        supportsDeveloperRole: provider.compat.supportsDeveloperRole,
        supportsReasoningEffort: provider.compat.supportsReasoningEffort,
        supportsUsageInStreaming: provider.compat.supportsUsageInStreaming
      }
    }
  }

  const { getModels } = await loadPiAi()
  const model = getModels(provider.providerId as KnownProvider).find(
    (item) => item.id === provider.modelId
  )
  if (!model) throw new Error(`模型不存在: ${provider.providerId}/${provider.modelId}`)

  return {
    ...model,
    contextWindow: provider.contextWindow || model.contextWindow,
    maxTokens: provider.maxTokens || model.maxTokens
  }
}

export async function testConnection(provider: ProviderSettings, apiKey: string): Promise<string> {
  const { completeSimple } = await loadPiAi()
  const model = await buildModel(provider)
  const effort = provider.reasoningEffort

  const message = await completeSimple(
    model,
    { messages: [{ role: 'user', content: 'ping', timestamp: Date.now() }] },
    {
      apiKey,
      maxTokens: 16,
      ...(effort && effort !== 'off' ? { reasoning: effort } : {})
    }
  )

  if (message.stopReason === 'error') {
    throw new Error(message.errorMessage ?? '请求失败')
  }
  return model.id
}
