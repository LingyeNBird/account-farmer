import { AppShell, Button, Group, Text } from '@mantine/core'
import { useAppStore } from './store'
import { Accounts } from './screens/Accounts'
import { Prompts } from './screens/Prompts'
import { Settings } from './screens/Settings'
import { Workbench } from './screens/Workbench'

export function App() {
  const view = useAppStore((state) => state.view)
  const setView = useAppStore((state) => state.setView)

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
            <Text size="xs" c="dimmed" mr="xs">
              未配置模型
            </Text>
            <Button variant="subtle" color="gray" size="compact-sm" onClick={() => setView('accounts')}>
              账号
            </Button>
            <Button variant="subtle" color="gray" size="compact-sm" onClick={() => setView('prompts')}>
              提示词
            </Button>
            <Button variant="subtle" color="gray" size="compact-sm" onClick={() => setView('settings')}>
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
