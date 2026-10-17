import { ActionIcon, Badge, Box, Group, Stack, Text, Title } from '@mantine/core'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useAppStore } from '../store'
import { ErrorBubble } from './ErrorBubble'
import { OutgoingCard, PasteCard, ReplyCard, ResultCard } from './TurnCards'

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
  const streaming = turnStreaming !== null
  const basePages = Math.max(total, 1)
  const pageCount = basePages + (streaming ? 1 : 0)
  const current = position === null ? pageCount : Math.min(Math.max(position, 1), pageCount)

  useEffect(() => {
    setPosition(null)
    setPaste('')
    setEditedEn(null)
  }, [selectedTopicId])

  useEffect(() => {
    setEditedEn(null)
  }, [current, total])

  useEffect(() => {
    setPaste('')
  }, [total])

  useEffect(() => {
    if (streaming) setPosition(null)
  }, [streaming])

  if (!topic) return <Box style={{ padding: '18px 22px 26px' }} />

  const streamingPage = streaming && current === pageCount
  const turn = current <= total ? turns[current - 1] : undefined
  const inputPage = !streamingPage && (current === total || total === 0)

  let repliesSinceFeedback = 0
  for (let cursor = turns.length - 1; cursor >= 0; cursor -= 1) {
    if (turns[cursor].feedback) break
    repliesSinceFeedback += 1
  }

  const submit = async (): Promise<void> => {
    if (!paste.trim() || turnLoading) return
    await generateTurn(paste)
  }

  const pasteCard = (
    <PasteCard
      value={paste}
      onChange={setPaste}
      canSubmit={Boolean(paste.trim()) && !turnLoading}
      generating={streaming}
      repliesSinceFeedback={repliesSinceFeedback}
      onSubmit={() => void submit()}
      onAbort={() => void abortTurn()}
    />
  )

  return (
    <Box pos="relative" style={{ padding: '18px 22px 26px' }}>
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
                第 {current} 轮
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
              disabled={current <= 1}
              onClick={() => setPosition(current - 1)}
            >
              <IconChevronLeft size={14} />
            </ActionIcon>
            <Text size="xs" c="dimmed">
              {current} / {pageCount}
            </Text>
            <ActionIcon
              variant="default"
              size="sm"
              aria-label="下一轮"
              disabled={current >= pageCount}
              onClick={() => setPosition(current + 1)}
            >
              <IconChevronRight size={14} />
            </ActionIcon>
          </Group>
        </Group>

        {streamingPage ? (
          <ResultCard
            turn={undefined}
            streamingText={turnStreaming}
            editedEn={editedEn}
            onEditEn={setEditedEn}
            onAbort={() => void abortTurn()}
          />
        ) : turn ? (
          <>
            <ResultCard
              turn={turn}
              streamingText={null}
              editedEn={editedEn}
              onEditEn={setEditedEn}
            />
            {current < total && <ReplyCard text={turn.aiReply} />}
            {inputPage && pasteCard}
          </>
        ) : (
          <>
            <OutgoingCard en={topic.openingEn} zh={topic.openingZh} />
            {pasteCard}
          </>
        )}
      </Stack>

      {error && <ErrorBubble message={error} onDismiss={clearError} />}
    </Box>
  )
}
