import { ActionIcon, Alert, Badge, Box, Group, Stack, Text, Title } from '@mantine/core'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useAppStore } from '../store'
import { OutgoingCard, PasteCard, ResultCard } from './TurnCards'

export function TopicWorkspace() {
  const topics = useAppStore((state) => state.topics)
  const selectedTopicId = useAppStore((state) => state.selectedTopicId)
  const session = useAppStore((state) => state.session)
  const turnStreaming = useAppStore((state) => state.turnStreaming)
  const turnLoading = useAppStore((state) => state.turnLoading)
  const error = useAppStore((state) => state.error)
  const clearError = useAppStore((state) => state.clearError)
  const generateTurn = useAppStore((state) => state.generateTurn)
  const abortTurn = useAppStore((state) => state.abortTurn)

  const [paste, setPaste] = useState('')
  const [position, setPosition] = useState<number | null>(null)
  const [editedEn, setEditedEn] = useState<string | null>(null)

  const topic = topics.find((item) => item.id === selectedTopicId)
  const turns = session?.turns ?? []
  const total = turns.length
  const index = position === null ? Math.max(total, 1) : Math.min(position, Math.max(total, 1))
  const turn = total > 0 ? turns[index - 1] : undefined
  const streaming = turnStreaming !== null

  useEffect(() => {
    setPosition(null)
    setPaste('')
  }, [selectedTopicId])

  useEffect(() => {
    setEditedEn(null)
  }, [index, total])

  if (!topic) return <Box style={{ padding: '18px 22px 26px' }} />

  const isLatest = index === total || total === 0
  const outgoingEn = turn?.messageEn || topic.openingEn
  const outgoingZh = turn?.messageZh || topic.openingZh

  let repliesSinceFeedback = 0
  for (let cursor = turns.length - 1; cursor >= 0; cursor -= 1) {
    if (turns[cursor].feedback) break
    repliesSinceFeedback += 1
  }

  const submit = async (): Promise<void> => {
    if (!paste.trim() || turnLoading) return
    await generateTurn(paste)
    if (!useAppStore.getState().error) setPaste('')
  }

  return (
    <Box style={{ padding: '18px 22px 26px' }}>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Box>
            <Group gap={6} wrap="nowrap">
              <Badge variant="filled" color="dark" radius="sm">
                主题 {topic.seq}
              </Badge>
              {topic.domains.map((domain) => (
                <Badge key={domain} variant="light" color="gray" radius="sm">
                  {domain}
                </Badge>
              ))}
              <Badge variant="light" color="gray" radius="sm">
                第 {index} 轮
              </Badge>
            </Group>
            <Title order={4} mt={6}>
              {topic.title}
            </Title>
          </Box>
          <Group gap={4} wrap="nowrap">
            <ActionIcon
              variant="default"
              size="sm"
              aria-label="上一轮"
              disabled={index <= 1}
              onClick={() => setPosition(index - 1)}
            >
              <IconChevronLeft size={14} />
            </ActionIcon>
            <Text size="xs" c="dimmed">
              {index} / {Math.max(total, 1)}
            </Text>
            <ActionIcon
              variant="default"
              size="sm"
              aria-label="下一轮"
              disabled={index >= Math.max(total, 1)}
              onClick={() => setPosition(index + 1)}
            >
              <IconChevronRight size={14} />
            </ActionIcon>
          </Group>
        </Group>

        {error && (
          <Alert color="red" variant="light" withCloseButton onClose={clearError}>
            {error}
          </Alert>
        )}

        {streaming ? (
          <>
            <OutgoingCard en={outgoingEn} zh={outgoingZh} />
            {isLatest && (
              <PasteCard
                value={paste}
                onChange={setPaste}
                disabled
                canSubmit={false}
                hideAction
                repliesSinceFeedback={repliesSinceFeedback}
                onSubmit={() => void submit()}
              />
            )}
            <ResultCard
              turn={undefined}
              streamingText={turnStreaming}
              editedEn={editedEn}
              onEditEn={setEditedEn}
              onAbort={() => void abortTurn()}
            />
          </>
        ) : (
          <>
            {turn ? (
              <ResultCard
                turn={turn}
                streamingText={null}
                editedEn={editedEn}
                onEditEn={setEditedEn}
              />
            ) : (
              <OutgoingCard en={outgoingEn} zh={outgoingZh} />
            )}
            {isLatest && (
              <PasteCard
                value={paste}
                onChange={setPaste}
                disabled={turnLoading}
                canSubmit={Boolean(paste.trim()) && !turnLoading}
                repliesSinceFeedback={repliesSinceFeedback}
                onSubmit={() => void submit()}
              />
            )}
          </>
        )}
      </Stack>
    </Box>
  )
}
