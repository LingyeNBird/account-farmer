import {
  Box,
  Button,
  Divider,
  Grid,
  Group,
  NumberInput,
  PasswordInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput
} from '@mantine/core'
import { useEffect, useState } from 'react'
import type { ModelInfo, ProviderInfo, ReasoningEffort, Settings as SettingsValue } from '@shared/types'
import { api } from '../api'
import { PageHead } from '../components/PageHead'
import { useAppStore } from '../store'

const EFFORT_OPTIONS: { value: ReasoningEffort & string; label: string }[] = [
  { value: 'off', label: '关闭' },
  { value: 'minimal', label: '最低' },
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'xhigh', label: '最高' }
]

const CUSTOM_PROVIDER = 'custom'

type TestState = { status: 'idle' | 'running' | 'ok' | 'fail'; message: string }

function SettingsForm({ initial }: { initial: SettingsValue }) {
  const hasKey = useAppStore((state) => state.hasKey)
  const saveSettings = useAppStore((state) => state.saveSettings)

  const [draft, setDraft] = useState<SettingsValue>(initial)
  const [apiKey, setApiKey] = useState('')
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [models, setModels] = useState<ModelInfo[]>([])
  const [test, setTest] = useState<TestState>({ status: 'idle', message: '' })

  const provider = draft.provider
  const isCustom = provider.providerId === CUSTOM_PROVIDER

  useEffect(() => {
    void api.listProviders().then(setProviders)
  }, [])

  useEffect(() => {
    if (!provider.providerId || provider.providerId === CUSTOM_PROVIDER) {
      setModels([])
      return
    }
    let cancelled = false
    void api.listModels(provider.providerId).then((list) => {
      if (cancelled) return
      setModels(list)
      const selected = list.find((model) => model.id === provider.modelId)
      if (!selected && list.length > 0) {
        applyModel(list[0])
      } else if (selected) {
        setDraft((current) => ({
          ...current,
          provider: {
            ...current.provider,
            contextWindow: selected.contextWindow,
            maxTokens: selected.maxTokens
          }
        }))
      }
    })
    return () => {
      cancelled = true
    }
  }, [provider.providerId])

  function applyModel(model: ModelInfo | undefined): void {
    if (!model) return
    setDraft((current) => ({
      ...current,
      provider: {
        ...current.provider,
        modelId: model.id,
        contextWindow: model.contextWindow,
        maxTokens: model.maxTokens,
        reasoningEffort: model.reasoning ? current.provider.reasoningEffort : 'off'
      }
    }))
  }

  function patchProvider(patch: Partial<SettingsValue['provider']>): void {
    setDraft((current) => ({ ...current, provider: { ...current.provider, ...patch } }))
  }

  function patchCompat(patch: Partial<SettingsValue['provider']['compat']>): void {
    setDraft((current) => ({
      ...current,
      provider: { ...current.provider, compat: { ...current.provider.compat, ...patch } }
    }))
  }

  const selectedModel = models.find((model) => model.id === provider.modelId)
  const effortData = EFFORT_OPTIONS.filter(
    (option) => option.value === 'off' || !selectedModel || selectedModel.reasoning
  )

  const runTest = async (): Promise<void> => {
    setTest({ status: 'running', message: '' })
    try {
      const modelId = await api.testConnection(provider, apiKey)
      setTest({ status: 'ok', message: `连接成功 ${modelId}` })
    } catch (error) {
      setTest({ status: 'fail', message: error instanceof Error ? error.message : String(error) })
    }
  }

  return (
    <Box style={{ padding: '18px 22px 26px' }}>
      <Stack gap="lg">
        <PageHead title="设置" />

        <Grid gap="xl">
          <Grid.Col span={7}>
            <Stack gap="sm">
              <Text size="sm" fw={600}>
                供应商
              </Text>
              <Select
                label="供应商"
                data={[
                  ...providers.map((item) => ({ value: item.id, label: item.name })),
                  { value: CUSTOM_PROVIDER, label: '自定义（OpenAI 兼容）' }
                ]}
                value={provider.providerId || null}
                onChange={(value) =>
                  patchProvider({
                    providerId: value ?? '',
                    modelId: value === CUSTOM_PROVIDER ? '' : provider.modelId,
                    reasoningEffort: value === CUSTOM_PROVIDER ? null : 'off'
                  })
                }
                searchable
                placeholder="未选择"
              />

              <TextInput
                label="Base URL"
                value={isCustom ? provider.baseUrl : (selectedModel?.baseUrl ?? '')}
                readOnly={!isCustom}
                onChange={(event) => patchProvider({ baseUrl: event.currentTarget.value })}
              />

              <Box key={provider.providerId} className="fade-in">
                {isCustom ? (
                  <TextInput
                    label="模型 ID"
                    value={provider.modelId}
                    onChange={(event) => patchProvider({ modelId: event.currentTarget.value })}
                  />
                ) : (
                  <Select
                    label="模型"
                    data={models.map((model) => ({ value: model.id, label: model.name }))}
                    value={provider.modelId || null}
                    onChange={(value) => applyModel(models.find((model) => model.id === value))}
                    searchable
                    placeholder="未选择"
                    disabled={!provider.providerId || isCustom}
                  />
                )}
              </Box>

              <PasswordInput
                label="API Key"
                placeholder={hasKey ? '已保存' : ''}
                value={apiKey}
                onChange={(event) => setApiKey(event.currentTarget.value)}
              />

              <Select
                label="思考强度"
                data={effortData}
                value={provider.reasoningEffort}
                onChange={(value) =>
                  patchProvider({ reasoningEffort: (value as ReasoningEffort) ?? null })
                }
                allowDeselect={false}
                placeholder="未选择"
              />

              <Group grow>
                <NumberInput
                  label="上下文窗口"
                  value={provider.contextWindow}
                  min={1024}
                  step={1024}
                  onChange={(value) => patchProvider({ contextWindow: Number(value) || 0 })}
                />
                <NumberInput
                  label="最大输出"
                  value={provider.maxTokens}
                  min={256}
                  step={256}
                  onChange={(value) => patchProvider({ maxTokens: Number(value) || 0 })}
                />
              </Group>

              <Divider label="兼容开关" labelPosition="left" mt="xs" />
              <Switch
                label="支持 developer 角色"
                checked={provider.compat.supportsDeveloperRole}
                onChange={(event) => patchCompat({ supportsDeveloperRole: event.currentTarget.checked })}
              />
              <Switch
                label="支持 reasoning_effort"
                checked={provider.compat.supportsReasoningEffort}
                onChange={(event) =>
                  patchCompat({ supportsReasoningEffort: event.currentTarget.checked })
                }
              />
              <Switch
                label="流式返回用量"
                checked={provider.compat.supportsUsageInStreaming}
                onChange={(event) =>
                  patchCompat({ supportsUsageInStreaming: event.currentTarget.checked })
                }
              />

              <Group gap="sm" mt="xs">
                <Button
                  variant="default"
                  loading={test.status === 'running'}
                  onClick={() => void runTest()}
                >
                  测试连接
                </Button>
                {test.status === 'ok' && (
                  <Text size="xs" c="teal.7">
                    {test.message}
                  </Text>
                )}
                {test.status === 'fail' && (
                  <Text size="xs" c="red.7">
                    {test.message}
                  </Text>
                )}
              </Group>
            </Stack>
          </Grid.Col>

          <Grid.Col span={5}>
            <Stack gap="sm">
              <Text size="sm" fw={600}>
                生成行为
              </Text>
              <NumberInput
                label="反馈兜底阈值"
                value={draft.feedback.fallbackAfter}
                min={1}
                max={20}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    feedback: { fallbackAfter: Number(value) || 4 }
                  }))
                }
              />

              <Divider my="xs" />
              <Text size="sm" fw={600}>
                通知
              </Text>
              <Switch
                label="窗口未聚焦时发送系统通知"
                checked={draft.notify.onUnfocused}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    notify: { onUnfocused: event.currentTarget.checked }
                  }))
                }
              />
            </Stack>
          </Grid.Col>
        </Grid>

        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={() => setDraft(initial)}>
            放弃更改
          </Button>
          <Button onClick={() => void saveSettings(draft, apiKey)}>保存</Button>
        </Group>
      </Stack>
    </Box>
  )
}

export function Settings() {
  const settings = useAppStore((state) => state.settings)
  if (!settings) return null
  return <SettingsForm initial={settings} />
}
