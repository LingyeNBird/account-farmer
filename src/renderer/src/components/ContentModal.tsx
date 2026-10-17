import { Box, Button, Center, Group, Overlay, Paper, Stack, Text } from '@mantine/core'
import type { ReactNode } from 'react'

type Props = {
  title: string
  children: ReactNode
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ContentModal({ title, children, confirmLabel, danger, onConfirm, onCancel }: Props) {
  return (
    <Box pos="absolute" inset={0} style={{ zIndex: 300 }}>
      <Overlay color="#000" backgroundOpacity={0.18} style={{ position: 'absolute', zIndex: 0 }} />
      <Center pos="absolute" inset={0} p="md" style={{ zIndex: 1 }}>
        <Paper w={380} p="lg" radius="md" withBorder shadow="md">
          <Stack gap="sm">
            <Text fw={600}>{title}</Text>
            {children}
            <Group justify="flex-end" gap="xs" mt="xs">
              <Button variant="default" size="compact-sm" onClick={onCancel}>
                取消
              </Button>
              <Button color={danger ? 'red' : undefined} size="compact-sm" onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Center>
    </Box>
  )
}
