import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Loader,
  Menu,
  NavLink,
  ScrollArea,
  Stack,
  Text
} from '@mantine/core'
import { IconChevronLeft, IconChevronRight, IconTrash } from '@tabler/icons-react'
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
  const refilling = useAppStore((state) => state.refilling)
  const requestDeleteTopic = useAppStore((state) => state.requestDeleteTopic)
  const [page, setPage] = useState(0)
  const [menuPoint, setMenuPoint] = useState<{ x: number; y: number; topic: Topic } | null>(null)

  const batches = groupBatches(topics)
  const safePage = Math.min(page, Math.max(batches.length - 1, 0))
  const visible = batches[safePage] ?? []

  return (
    <Stack gap={0} h="100%">
      {refilling && (
        <Group gap={6} px="sm" py={6} style={{ borderBottom: '1px solid #e6e6ea', background: '#fdf7ec' }}>
          <Loader size={11} color="gray" />
          <Text size="xs" c="dimmed">
            生成中
          </Text>
        </Group>
      )}
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
              <div
                key={topic.id}
                onContextMenu={(event) => {
                  event.preventDefault()
                  setMenuPoint({ x: event.clientX, y: event.clientY, topic })
                }}
              >
                <NavLink
                  active={topic.id === selectedTopicId}
                  onClick={() => void selectTopic(topic.id)}
                  color={topic.status === 'archived' ? 'teal' : 'indigo'}
                  label={
                    <Text fz={15} fw={600} lineClamp={1} lh={1.35}>
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
              </div>
            ))}
          </Stack>
        </Box>
      </ScrollArea>
      <Menu
        opened={menuPoint !== null}
        onClose={() => setMenuPoint(null)}
        position="bottom-start"
        offset={2}
        withinPortal
      >
        <Menu.Target>
          <div
            style={{
              position: 'fixed',
              left: menuPoint?.x ?? 0,
              top: menuPoint?.y ?? 0,
              width: 1,
              height: 1,
              pointerEvents: 'none'
            }}
          />
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            color="red"
            leftSection={<IconTrash size={14} />}
            onClick={() => {
              const topic = menuPoint?.topic
              setMenuPoint(null)
              if (topic) requestDeleteTopic(topic)
            }}
          >
            删除主题
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Stack>
  )
}
