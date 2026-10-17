import { ActionIcon, Box, Button, Group, Stack, Text, Title } from '@mantine/core'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store'
import { ContentModal } from './ContentModal'
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
  const endTopic = useAppStore((state) => state.endTopic)
  const activateTopic = useAppStore((state) => state.activateTopic)
  const updateTopicOpening = useAppStore((state) => state.updateTopicOpening)

  const [paste, setPaste] = useState('')
  const [position, setPosition] = useState<number | null>(null)
  const [editedEn, setEditedEn] = useState<string | null>(null)
  const [switchPrompt, setSwitchPrompt] = useState<string | null>(null)

  const topic = topics.find((item) => item.id === selectedTopicId)
  const turns = session?.turns ?? []
  const total = turns.length
  const streaming = turnStreaming !== null
  // 第 1 页固定是主题开场，轮次从第 2 页开始；生成中在末尾多一页。
  const pageCount = 1 + total + (streaming ? 1 : 0)
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

  const [contentAnim, setContentAnim] = useState('')
  const lastView = useRef<{ topicId: string; index: number } | null>(null)
  useEffect(() => {
    const next = { topicId: topic?.id ?? '', index: current }
    const last = lastView.current
    lastView.current = next
    if (!last) return
    if (last.topicId !== next.topicId) {
      setContentAnim('fade-in')
    } else if (last.index !== next.index) {
      if (position === null) {
        setContentAnim('fade-in')
      } else {
        setContentAnim(next.index > last.index ? 'slide-right' : 'slide-left')
      }
    } else {
      setContentAnim('')
    }
  }, [topic?.id, current, position])

  if (!topic) return <Box style={{ padding: '18px 22px 26px' }} />

  const streamingPage = streaming && current === pageCount
  // 第 1 页是开场 + 对方回复；第 k 页是第 k-1 轮的我方发言 + 对方回复。
  const turnIndex = current - 2
  const turn = turnIndex >= 0 && turnIndex < total ? turns[turnIndex] : undefined
  const openingReply = session?.openingReply
  const archived = topic.status === 'archived'
  const inputPage = !streaming && !archived && current === total + 1
  const activeTopic = topics.find((item) => item.status === 'active')
  const needsActivation = !archived && topic.status !== 'active' && activeTopic !== undefined


  const submit = async (): Promise<void> => {
    if (!paste.trim() || turnLoading) return
    if (needsActivation) {
      setSwitchPrompt(paste)
      return
    }
    await generateTurn(paste)
  }

  const confirmSwitch = async (): Promise<void> => {
    if (!switchPrompt) return
    const reply = switchPrompt
    setSwitchPrompt(null)
    await activateTopic(topic.id)
    await generateTurn(reply)
  }

  const pasteCard = (
    <PasteCard
      value={paste}
      onChange={setPaste}
      canSubmit={Boolean(paste.trim()) && !turnLoading}
      generating={streaming}
      onSubmit={() => void submit()}
      onAbort={() => void abortTurn()}
    />
  )

  return (
    <Box pos="relative" style={{ padding: '18px 22px 26px' }}>
      <Stack gap="md" key={`${topic.id}-${current}`} className={contentAnim}>
        <Group justify="space-between" align="center" wrap="nowrap">
          <Title order={4}>{topic.title}</Title>
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
            {topic.status === 'active' && (
              <Button variant="default" size="compact-sm" ml="xs" onClick={() => void endTopic()}>
                手动结束主题
              </Button>
            )}
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
              onRevert={() => setEditedEn(null)}
            />
            {turn.reply && <ReplyCard text={turn.reply} />}
            {inputPage && pasteCard}
          </>
        ) : (
          <>
            <OutgoingCard
              key={topic.id}
              en={topic.openingEn}
              zh={topic.openingZh}
              onSave={(en, zh) => void updateTopicOpening(topic.id, en, zh)}
            />
            {openingReply && <ReplyCard text={openingReply} />}
            {inputPage && pasteCard}
          </>
        )}
      </Stack>

      {error && <ErrorBubble message={error} onDismiss={clearError} />}

      {switchPrompt !== null && activeTopic && (
        <ContentModal
          title={`主题 ${activeTopic.seq} 未完成`}
          confirmLabel="继续"
          onConfirm={() => void confirmSwitch()}
          onCancel={() => setSwitchPrompt(null)}
        >
          <Text size="sm" c="dimmed">
            继续发送会把主题 {activeTopic.seq} 归档。
          </Text>
        </ContentModal>
      )}
    </Box>
  )
}
