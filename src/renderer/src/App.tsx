import { AppShell, Button, Group, Text } from '@mantine/core'
import { IconFileText, IconSettings, IconUser } from '@tabler/icons-react'
import { useEffect, useRef } from 'react'
import { isConfigured } from './readiness'
import { useAppStore } from './store'
import { Accounts } from './screens/Accounts'
import { Prompts } from './screens/Prompts'
import { Settings } from './screens/Settings'
import { Workbench } from './screens/Workbench'

const EFFORT_LABELS: Record<string, string> = {
  off: '关闭思考',
  minimal: '最低思考',
  low: '低思考',
  medium: '中思考',
  high: '高思考',
  xhigh: '最高思考'
}

export function App() {
  const view = useAppStore((state) => state.view)
  const setView = useAppStore((state) => state.setView)
  const accounts = useAppStore((state) => state.accounts)
  const currentAccountId = useAppStore((state) => state.currentAccountId)
  const settings = useAppStore((state) => state.settings)
  const hasKey = useAppStore((state) => state.hasKey)
  const refreshAccounts = useAppStore((state) => state.refreshAccounts)
  const refreshSettings = useAppStore((state) => state.refreshSettings)

  useEffect(() => {
    void refreshAccounts()
    void refreshSettings()
  }, [refreshAccounts, refreshSettings])

  const routed = useRef(false)
  useEffect(() => {
    if (routed.current || !settings) return
    routed.current = true
    if (!isConfigured(settings, hasKey)) setView('settings')
  }, [settings, hasKey, setView])

  const currentAccountName = accounts.find((account) => account.id === currentAccountId)?.name
  const provider = settings?.provider
  const effort = provider?.reasoningEffort ?? null

  return (
    <AppShell
      header={{ height: 48 }}
      navbar={{ width: 264, breakpoint: 'sm', collapsed: { mobile: true } }}
      padding={0}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Text size="sm" fw={600}>
            AI 养号工作台
          </Text>
          <Group gap={4} wrap="nowrap">
            <Button
              variant="subtle"
              color="gray"
              size="compact-sm"
              leftSection={<IconUser size={15} />}
              onClick={() => setView('accounts')}
            >
              {currentAccountName ?? '无账号'}
            </Button>
            <Group gap={6} px="xs" wrap="nowrap">
              <Text size="xs" c={provider?.modelId ? undefined : 'dimmed'}>
                {provider?.modelId || '未配置模型'}
              </Text>
              {effort && (
                <Text size="xs" c="dimmed">
                  {EFFORT_LABELS[effort]}
                </Text>
              )}
            </Group>
            <Button
              variant="subtle"
              color="gray"
              size="compact-sm"
              leftSection={<IconFileText size={15} />}
              onClick={() => setView('prompts')}
            >
              提示词
            </Button>
            <Button
              variant="subtle"
              color="gray"
              size="compact-sm"
              leftSection={<IconSettings size={15} />}
              onClick={() => setView('settings')}
            >
              设置
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p={0} />

      <AppShell.Main h="calc(100vh - 48px)" style={{ overflow: 'auto' }}>
        {view === 'workbench' && <Workbench />}
        {view === 'accounts' && <Accounts />}
        {view === 'prompts' && <Prompts />}
        {view === 'settings' && <Settings />}
      </AppShell.Main>
    </AppShell>
  )
}
