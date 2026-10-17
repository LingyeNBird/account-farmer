import { Badge, Box, Button, Grid, Group, Paper, Text, Textarea } from '@mantine/core'
import type { ReactNode } from 'react'
import { IconThumbDown, IconThumbUp } from '@tabler/icons-react'
import type { Turn } from '@shared/types'
import { api } from '../api'
import { CopyButton } from './CopyButton'

const words = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length
const sentences = (text: string): number => text.split(/[.!?]+/).filter((part) => part.trim()).length

export function CardHeader({
  step,
  title,
  right,
  badge
}: {
  step?: number
  title: string
  right?: ReactNode
  badge?: ReactNode
}) {
  return (
    <Group gap="sm" px="md" py="sm" style={{ borderBottom: '1px solid #efeff2' }}>
      {step !== undefined && (
        <Badge radius="xl" variant="filled" color="dark" miw={26} h={26} px={0}>
          {step}
        </Badge>
      )}
      <Text size="sm" fw={600}>
        {title}
      </Text>
      {badge}
      <Box style={{ flex: 1 }} />
      {right}
    </Group>
  )
}

function ColumnHead({ left, right }: { left: string; right?: ReactNode }) {
  return (
    <Group justify="space-between" mb={6}>
      <Text size="xs" c="dimmed" fw={600}>
        {left}
      </Text>
      {right}
    </Group>
  )
}

export function OutgoingCard({ en, zh }: { en: string; zh: string }) {
  return (
    <Paper withBorder radius="md">
      <CardHeader
        step={1}
        title="发给目标 AI"
        right={
          <Group gap={6} wrap="nowrap">
            <Badge variant="light" color="gray" radius="sm">
              {words(en)} 词
            </Badge>
            <Badge variant="light" color="gray" radius="sm">
              {sentences(en)} 句
            </Badge>
            <CopyButton text={en} label="复制英文" />
          </Group>
        }
      />
      <Grid gap="lg" p="md">
        <Grid.Col span={6}>
          <ColumnHead left="英文" />
          <Text size="sm" fw={500} style={{ whiteSpace: 'pre-wrap' }}>
            {en}
          </Text>
        </Grid.Col>
        <Grid.Col span={6}>
          <ColumnHead left="中文对照" />
          <Text size="sm" c="dimmed" fw={500} style={{ whiteSpace: 'pre-wrap' }}>
            {zh}
          </Text>
        </Grid.Col>
      </Grid>
    </Paper>
  )
}

export function ReplyCard({ text }: { text: string }) {
  return (
    <Paper withBorder radius="md">
      <CardHeader
        title="AI 回复"
        right={
          <Text size="xs" c="dimmed">
            {text.length} 字符
          </Text>
        }
      />
      <Box px="md" py="sm">
        <Text size="sm" fw={500} style={{ whiteSpace: 'pre-wrap' }}>
          {text}
        </Text>
      </Box>
    </Paper>
  )
}

export function ResultCard({
  turn,
  streamingText,
  editedEn,
  onEditEn,
  onAbort
}: {
  turn?: Turn
  streamingText: string | null
  editedEn: string | null
  onEditEn: (value: string) => void
  onAbort?: () => void
}) {
  const streaming = streamingText !== null
  const en = editedEn ?? turn?.messageEn ?? ''
  const positive = turn?.feedback?.verdict === 'good'

  return (
    <Paper withBorder radius="md">
      <CardHeader
        step={3}
        title="生成结果"
        badge={
          streaming ? (
            <Badge variant="light" color="indigo" radius="sm">
              生成中
            </Badge>
          ) : (
            <Badge variant="light" color="teal" radius="sm">
              就绪
            </Badge>
          )
        }
        right={
          streaming && onAbort ? (
            <Button size="compact-sm" variant="default" onClick={onAbort}>
              取消
            </Button>
          ) : undefined
        }
      />

      {streaming ? (
        <Box px="md" py="sm">
          <Text size="sm" c="dimmed" fw={500} style={{ whiteSpace: 'pre-wrap' }}>
            {streamingText}
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
          <Grid gap="lg" p="md">
            <Grid.Col span={6}>
              <ColumnHead
                left="英文"
                right={
                  <Badge variant="light" color="gray" radius="sm">
                    可编辑
                  </Badge>
                }
              />
              <Textarea
                value={en}
                onChange={(event) => onEditEn(event.currentTarget.value)}
                autosize
                minRows={3}
                variant="unstyled"
                p={0}
              />
              <CopyButton text={en} label="复制正文" mt="xs" />
            </Grid.Col>
            <Grid.Col span={6}>
              <ColumnHead left="中文对照" />
              <Text size="sm" c="dimmed" fw={500} style={{ whiteSpace: 'pre-wrap' }}>
                {turn?.messageZh}
              </Text>
            </Grid.Col>
          </Grid>

          {turn?.feedback && (
            <Box px="md" pb="md">
              <Box
                p="xs"
                style={{ border: '1px solid #efeff2', borderRadius: 6, cursor: 'pointer' }}
                onClick={() => void api.copyText(turn.feedback?.en ?? '')}
              >
                <Group gap={8} wrap="nowrap" align="flex-start">
                  <Box c={positive ? 'teal.6' : 'orange.6'} pt={2}>
                    {positive ? <IconThumbUp size={18} /> : <IconThumbDown size={18} />}
                  </Box>
                  <Box>
                    <Text size="sm" fw={500}>{turn.feedback.en}</Text>
                    <Text size="xs" c="dimmed" mt={2}>
                      {turn.feedback.zh}
                    </Text>
                  </Box>
                </Group>
              </Box>
            </Box>
          )}
        </>
      )}
    </Paper>
  )
}

export function PasteCard({
  value,
  onChange,
  canSubmit,
  generating,
  repliesSinceFeedback,
  onSubmit,
  onAbort
}: {
  value: string
  onChange: (value: string) => void
  canSubmit: boolean
  generating: boolean
  repliesSinceFeedback: number
  onSubmit: () => void
  onAbort: () => void
}) {
  return (
    <Paper withBorder radius="md">
      <CardHeader
        step={2}
        title="粘贴回复"
        right={
          <Text size="xs" c="dimmed">
            {value.length} 字符
          </Text>
        }
      />
      <Box px="md" py="sm">
        <Textarea
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          autosize={false}
          minRows={2}
          maxRows={2}
          placeholder=""
        />
      </Box>
      <Group px="md" pb="sm" gap="sm">
        {repliesSinceFeedback > 0 && (
          <Text size="xs" c="dimmed">
            距上次反馈 {repliesSinceFeedback} 轮
          </Text>
        )}
        <Box style={{ flex: 1 }} />
        {generating ? (
          <Group gap="xs" wrap="nowrap">
            <Button size="compact-sm" disabled>
              正在生成中
            </Button>
            <Button size="compact-sm" variant="default" onClick={onAbort}>
              取消
            </Button>
          </Group>
        ) : (
          <Button size="compact-sm" disabled={!canSubmit} onClick={onSubmit}>
            生成下一段
          </Button>
        )}
      </Group>
    </Paper>
  )
}
