import { ActionIcon, Badge, Box, Group, NavLink, ScrollArea, Stack, Text } from '@mantine/core'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { useState } from 'react'
import type { Topic } from '@shared/types'
import { useAppStore } from '../store'

function groupBatches(topics: Topic[]): Topic[][] {
  const order: string[] = []
  const groups: Topic[][] = []
  for (const topic of topics) {
    let index = order.indexOf(topic.batchId)
    if (index === -1) {
      order.push(topic.batchId)
      groups.push([])
      index = groups.length - 1
    }
    groups[index].push(topic)
  }
  return groups
}

const seqLabel = (seq: number): string => String(seq).padStart(2, '0')

export function TopicQueue() {
  const topics = useAppStore((state) => state.topics)
  const selectedTopicId = useAppStore((state) => state.selectedTopicId)
  const selectTopic = useAppStore((state) => state.selectTopic)
  const [page, setPage] = useState(0)

  const batches = groupBatches(topics)
  const safePage = Math.min(page, Math.max(batches.length - 1, 0))
  const visible = batches[safePage] ?? []

  return (
    <Stack gap={0} h="100%">
      {batches.length > 0 && (
        <Group justify="center" gap="xs" p={6} style={{ borderBottom: '1px solid #e6e6ea' }}>
          <ActionIcon
            variant="default"
            size="sm"
            aria-label="上一批"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
          >
            <IconChevronLeft size={14} />
          </ActionIcon>
          <Text size="xs" c="dimmed">
            {safePage + 1} / {batches.length}
          </Text>
          <ActionIcon
            variant="default"
            size="sm"
            aria-label="下一批"
            disabled={safePage >= batches.length - 1}
            onClick={() => setPage(safePage + 1)}
          >
            <IconChevronRight size={14} />
          </ActionIcon>
        </Group>
      )}

      <ScrollArea style={{ flex: 1 }}>
        <Box p={6}>
          <Stack gap={2}>
            {visible.map((topic) => (
              <NavLink
                key={topic.id}
                active={topic.id === selectedTopicId}
                onClick={() => void selectTopic(topic.id)}
                color={topic.status === 'archived' ? 'teal' : 'indigo'}
                label={
                  <Text fz={15} fw={500} lineClamp={1} lh={1.35}>
                    {topic.title}
                  </Text>
                }
                description={
                  <Group gap={4} mt={2} wrap="nowrap">
                    {topic.domains.slice(0, 1).map((domain) => (
                      <Badge key={domain} variant="light" color="gray" radius="sm">
                        {domain}
                      </Badge>
                    ))}
                    {topic.status === 'active' && (
                      <Badge variant="light" color="indigo" radius="sm">
                        进行中
                      </Badge>
                    )}
                    {topic.status === 'archived' && (
                      <Badge variant="light" color="teal" radius="sm">
                        已归档
                      </Badge>
                    )}
                  </Group>
                }
                leftSection={
                  <Badge
                    size="lg"
                    radius="sm"
                    miw={30}
                    px={0}
                    variant={topic.status === 'pending' ? 'light' : 'filled'}
                    color={
                      topic.status === 'archived'
                        ? 'teal'
                        : topic.status === 'active'
                          ? 'indigo'
                          : 'gray'
                    }
                  >
                    {seqLabel(topic.seq)}
                  </Badge>
                }
              />
            ))}
          </Stack>
        </Box>
      </ScrollArea>
    </Stack>
  )
}
