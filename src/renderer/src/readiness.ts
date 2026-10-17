import type { Settings } from '@shared/types'

export function isConfigured(settings: Settings | null, hasKey: boolean): boolean {
  if (!settings || !hasKey) return false
  const provider = settings.provider
  if (!provider.providerId || !provider.modelId || provider.reasoningEffort === null) return false
  if (provider.providerId === 'custom' && !/^https?:\/\//.test(provider.baseUrl.trim())) return false
  return true
}
