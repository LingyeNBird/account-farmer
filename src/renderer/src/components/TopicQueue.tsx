import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Collapse,
  Group,
  Loader,
  Menu,
  NavLink,
  Popover,
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
  const deleteTopic = useAppStore((state) => state.deleteTopic)
  const [page, setPage] = useState(0)
  const [direction, setDirection] = useState(1)
  const [menuPoint, setMenuPoint] = useState<{ x: number; y: number; topic: Topic } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmPoint, setConfirmPoint] = useState<{ x: number; y: number; topic: Topic } | null>(
    null
  )
  const [confirmOpen, setConfirmOpen] = useState(false)

  const batches = groupBatches(topics)
  const safePage = Math.min(page, Math.max(batches.length - 1, 0))
  const visible = batches[safePage] ?? []

  return (
    <Stack gap={0} h="100%">
      <Collapse expanded={refilling} transitionDuration={120}>
        <Group gap={6} px="sm" py={6} style={{ borderBottom: '1px solid #e6e6ea', background: '#fdf7ec' }}>
          <Loader size={11} color="gray" />
          <Text size="xs" c="dimmed">
            生成中
          </Text>
        </Group>
      </Collapse>
      {batches.length > 0 && (
        <Group justify="center" gap="xs" p={6} style={{ borderBottom: '1px solid #e6e6ea' }}>
          <ActionIcon
            variant="default"
            size="sm"
            aria-label="上一批"
            disabled={safePage === 0}
            onClick={() => {
              setDirection(-1)
              setPage(safePage - 1)
            }}
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
            onClick={() => {
              setDirection(1)
              setPage(safePage + 1)
            }}
          >
            <IconChevronRight size={14} />
          </ActionIcon>
        </Group>
      )}

      <ScrollArea style={{ flex: 1 }}>
        <Box p={6} key={safePage} className={direction === 1 ? 'slide-right' : 'slide-left'}>
          <Stack gap={2}>
            {visible.map((topic) => (
              <div
                key={topic.id}
                onContextMenu={(event) => {
                  event.preventDefault()
                  setMenuPoint({ x: event.clientX, y: event.clientY, topic })
                  requestAnimationFrame(() => setMenuOpen(true))
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
        opened={menuOpen}
        onClose={() => setMenuOpen(false)}
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
        <Menu.Dropdown
          style={{ position: 'fixed', left: menuPoint?.x ?? 0, top: menuPoint?.y ?? 0 }}
        >
          <Menu.Item
            color="red"
            leftSection={<IconTrash size={14} />}
            onClick={() => {
              if (menuPoint) {
                setConfirmPoint(menuPoint)
                requestAnimationFrame(() => setConfirmOpen(true))
              }
              setMenuOpen(false)
            }}
          >
            删除主题
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Popover
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        position="bottom-start"
        offset={2}
        withinPortal
        shadow="md"
      >
        <Popover.Target>
          <div
            style={{
              position: 'fixed',
              left: confirmPoint?.x ?? 0,
              top: confirmPoint?.y ?? 0,
              width: 1,
              height: 1,
              pointerEvents: 'none'
            }}
          />
        </Popover.Target>
        <Popover.Dropdown
          className="pop-fade"
          style={{ position: 'fixed', left: confirmPoint?.x ?? 0, top: confirmPoint?.y ?? 0 }}
        >
          <Stack gap={8} className="pop-rise-inner">
            <Text size="sm">删除主题 {confirmPoint?.topic.seq}？</Text>
            <Group gap={6} justify="flex-end">
              <Button size="compact-xs" variant="default" onClick={() => setConfirmOpen(false)}>
                取消
              </Button>
              <Button
                size="compact-xs"
                color="red"
                onClick={() => {
                  const topic = confirmPoint?.topic
                  setConfirmOpen(false)
                  if (topic) void deleteTopic(topic.id)
                }}
              >
                删除
              </Button>
            </Group>
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </Stack>
  )
}
