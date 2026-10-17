import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  Textarea,
  Title,
  UnstyledButton
} from '@mantine/core'
import { IconChevronLeft, IconChevronRight, IconThumbDown, IconThumbUp } from '@tabler/icons-react'
import { useEffect, useState, type ReactNode } from 'react'
import type { Turn } from '@shared/types'
import { api } from '../api'
import { useAppStore } from '../store'
import { CopyButton } from './CopyButton'

const wordCount = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length
const sentenceCount = (text: string): number => text.split(/[.!?]+/).filter((part) => part.trim()).length

function SectionHeader({ step, title, right }: { step: number; title: string; right?: ReactNode }) {
  return (
    <Group justify="space-between" px="md" py="sm" style={{ borderBottom: '1px solid #efeff2' }}>
      <Group gap="sm">
        <Badge radius="xl" variant="filled" color="dark" miw={26} h={26} px={0}>
          {step}
        </Badge>
        <Text size="sm" fw={600}>
          {title}
        </Text>
      </Group>
      {right}
    </Group>
  )
}

function FeedbackBlock({ turn }: { turn: Turn }) {
  const feedback = turn.feedback
  if (!feedback) return null
  const positive = feedback.verdict === 'good'
  return (
    <Box px="md" pb="md">
      <UnstyledButton
        w="100%"
        p="xs"
        style={{ borderRadius: 6, border: '1px solid #efeff2' }}
        onClick={() => void api.copyText(feedback.en)}
      >
        <Group gap={8} wrap="nowrap" align="flex-start">
          <Box c={positive ? 'teal.6' : 'orange.6'} pt={2}>
            {positive ? <IconThumbUp size={18} /> : <IconThumbDown size={18} />}
          </Box>
          <Box>
            <Text size="sm">{feedback.en}</Text>
            <Text size="xs" c="dimmed">
              {feedback.zh}
            </Text>
          </Box>
        </Group>
      </UnstyledButton>
    </Box>
  )
}

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
  const resultEn = editedEn ?? turn?.messageEn ?? ''
  const streaming = turnStreaming !== null

  const submit = async (): Promise<void> => {
    if (!paste.trim() || turnLoading) return
    await generateTurn(paste)
    setPaste('')
  }

  return (
    <Box style={{ padding: '18px 22px 26px' }}>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Box>
            <Text size="xs" c="dimmed">
              主题 {topic.seq}
            </Text>
            <Title order={4} mt={2}>
              {topic.title}
            </Title>
            <Group gap={6} mt={6}>
              {topic.domains.map((domain) => (
                <Badge key={domain} variant="light" color="gray" radius="sm">
                  {domain}
                </Badge>
              ))}
            </Group>
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

        <Paper withBorder radius="md">
          <SectionHeader
            step={1}
            title="发给目标 AI"
            right={
              <Group gap={10}>
                <Text size="xs" c="dimmed">
                  {wordCount(outgoingEn)} 词
                </Text>
                <Text size="xs" c="dimmed">
                  {sentenceCount(outgoingEn)} 句
                </Text>
                <CopyButton text={outgoingEn} label="复制英文" />
              </Group>
            }
          />
          <Box px="md" py="sm">
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
              {outgoingEn}
            </Text>
            <Text size="sm" c="dimmed" mt={10} style={{ whiteSpace: 'pre-wrap' }}>
              {outgoingZh}
            </Text>
          </Box>
        </Paper>

        {isLatest && !streaming && (
          <Paper withBorder radius="md">
            <SectionHeader step={2} title="粘贴回复" />
            <Box px="md" py="sm">
              <Textarea
                value={paste}
                onChange={(event) => setPaste(event.currentTarget.value)}
                autosize={false}
                minRows={2}
                maxRows={2}
                placeholder=""
              />
            </Box>
            <Group justify="space-between" px="md" pb="sm">
              <Text size="xs" c="dimmed">
                {paste.length} 字符
              </Text>
              {turnLoading ? (
                <Button size="compact-sm" variant="default" onClick={() => void abortTurn()}>
                  取消
                </Button>
              ) : (
                <Button size="compact-sm" disabled={!paste.trim()} onClick={() => void submit()}>
                  生成下一段
                </Button>
              )}
            </Group>
          </Paper>
        )}

        {(streaming || turn) && (
          <Paper withBorder radius="md">
            <SectionHeader
              step={3}
              title="生成结果"
              right={
                turn && !streaming ? (
                  <CopyButton text={resultEn} label="复制正文" />
                ) : (
                  <Text size="xs" c="dimmed">
                    生成中
                  </Text>
                )
              }
            />
            {streaming ? (
              <Box px="md" py="sm">
                <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                  {turnStreaming}
                </Text>
              </Box>
            ) : turn?.ended ? (
              <Box px="md" py="sm">
                <Text size="sm" c="dimmed">
                  本轮判定结束
                </Text>
              </Box>
            ) : (
              <>
                <Box px="md" py="sm">
                  <Textarea
                    value={resultEn}
                    onChange={(event) => setEditedEn(event.currentTarget.value)}
                    autosize
                    minRows={3}
                    variant="unstyled"
                  />
                  <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                    {turn?.messageZh}
                  </Text>
                </Box>
                {turn && <FeedbackBlock turn={turn} />}
              </>
            )}
          </Paper>
        )}
      </Stack>
    </Box>
  )
}
