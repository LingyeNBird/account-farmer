import { Alert, Badge, Box, Button, Group, Paper, Progress, Stack, Text, Title } from '@mantine/core'
import { useAppStore } from '../store'

export function Workbench() {
  const generating = useAppStore((state) => state.generating)
  const error = useAppStore((state) => state.error)
  const clearError = useAppStore((state) => state.clearError)
  const cancelTopicGeneration = useAppStore((state) => state.cancelTopicGeneration)

  if (!generating) {
    return (
      <Box style={{ padding: '18px 22px 26px' }}>
        {error && (
          <Alert color="red" variant="light" withCloseButton onClose={clearError}>
            {error}
          </Alert>
        )}
      </Box>
    )
  }

  const next = Math.min(generating.generated + 1, generating.total)

  return (
    <Box style={{ padding: '18px 22px 26px' }}>
      <Stack gap="md">
        <Box>
          <Group gap={6}>
            <Badge size="sm" variant="light" color="gray" radius="sm">
              初始化
            </Badge>
          </Group>
          <Title order={4} mt={4}>
            正在生成讨论主题
          </Title>
        </Box>

        <Paper withBorder radius="md">
          <Group justify="space-between" px="md" py="sm">
            <Text size="sm" fw={600}>
              进度
            </Text>
            <Group gap="sm">
              <Text size="xs" c="dimmed">
                {generating.generated} / {generating.total}
              </Text>
              <Button size="compact-sm" variant="default" onClick={() => void cancelTopicGeneration()}>
                取消
              </Button>
            </Group>
          </Group>
          <Box px="md" pb="md">
            <Progress
              value={(generating.generated / generating.total) * 100}
              size="sm"
              radius="xl"
              striped
              animated
            />
            <Text size="xs" c="dimmed" mt={8}>
              已生成 {generating.generated} 个，正在生成第 {next} 个
            </Text>
          </Box>
        </Paper>

        {generating.titles.length > 0 && (
          <Paper withBorder radius="md">
            <Box px="md" py="sm" style={{ borderBottom: '1px solid #efeff2' }}>
              <Text size="sm" fw={600}>
                已就绪
              </Text>
            </Box>
            <Stack gap={6} p="md">
              {generating.titles.map((title, index) => (
                <Group key={title} gap="sm" wrap="nowrap">
                  <Badge size="md" radius="sm" variant="light" color="teal">
                    {String(index + 1).padStart(2, '0')}
                  </Badge>
                  <Text size="sm">{title}</Text>
                </Group>
              ))}
            </Stack>
          </Paper>
        )}
      </Stack>
    </Box>
  )
}
