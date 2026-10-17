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
import type { UpdateInfo, UpdateProgress } from '@shared/ipc'
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
  const [version, setVersion] = useState('')
  const [update, setUpdate] = useState<UpdateInfo | null>(null)
  const [checking, setChecking] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState<UpdateProgress | null>(null)
  const [updateError, setUpdateError] = useState('')

  useEffect(() => {
    void api
      .getAppVersion()
      .then(setVersion)
      .catch(() => setVersion(''))
    return api.onUpdateProgress(setProgress)
  }, [])

  const checkUpdate = async (): Promise<void> => {
    setChecking(true)
    setUpdateError('')
    setProgress(null)
    try {
      setUpdate(await api.checkUpdate())
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : String(error))
    } finally {
      setChecking(false)
    }
  }

  const downloadUpdate = async (): Promise<void> => {
    setDownloading(true)
    setUpdateError('')
    try {
      await api.downloadUpdate()
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : String(error))
    } finally {
      setDownloading(false)
    }
  }

  const installUpdate = async (): Promise<void> => {
    try {
      await api.installUpdate()
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : String(error))
    }
  }
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
                label="主题最大轮数"
                value={draft.limits.maxRounds}
                min={1}
                max={50}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    limits: { maxRounds: Number(value) || 11 }
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

              <Divider my="xs" />
              <Text size="sm" fw={600}>
                版本与更新
              </Text>
              <Group gap="xs">
                <Text size="sm" c="dimmed">
                  当前版本 {version || '—'}
                </Text>
                <Button size="compact-sm" variant="default" loading={checking} onClick={() => void checkUpdate()}>
                  检查更新
                </Button>
              </Group>
              {update && (
                <Text size="sm" c={update.available ? undefined : 'dimmed'}>
                  {update.dev
                    ? '开发模式不检查更新'
                    : update.available
                      ? `发现新版本 ${update.latestVersion}`
                      : '已是最新版本'}
                </Text>
              )}
              {update?.available && !update.canWrite && (
                <Text size="sm" c="red.6">
                  {update.reason ?? '当前程序无法自动替换'}
                </Text>
              )}
              {update?.available && update.canWrite && (
                <Group gap="xs">
                  <Button
                    size="compact-sm"
                    loading={downloading}
                    disabled={progress?.state === 'ready'}
                    onClick={() => void downloadUpdate()}
                  >
                    {progress?.state === 'ready' ? '已下载' : '下载更新'}
                  </Button>
                  {progress?.state === 'downloading' && (
                    <Text size="xs" c="dimmed">
                      {Math.floor(progress.received / 1048576)} / {Math.floor(progress.total / 1048576)} MB
                    </Text>
                  )}
                </Group>
              )}
              {progress?.state === 'ready' && (
                <Button size="compact-sm" onClick={() => void installUpdate()}>
                  重启并安装
                </Button>
              )}
              {updateError && (
                <Text size="sm" c="red.6">
                  {updateError}
                </Text>
              )}
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
