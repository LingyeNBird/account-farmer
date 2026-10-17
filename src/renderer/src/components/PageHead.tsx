import { Button, Group, Title } from '@mantine/core'
import type { ReactNode } from 'react'
import { useAppStore } from '../store'

export function PageHead({ title, right }: { title: string; right?: ReactNode }) {
  const setView = useAppStore((state) => state.setView)

  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap">
      <Title order={4}>{title}</Title>
      <Group gap="xs" wrap="nowrap">
        {right}
        <Button variant="default" size="compact-sm" onClick={() => setView('workbench')}>
          返回工作台
        </Button>
      </Group>
    </Group>
  )
}
