import { Paper, Text } from '@mantine/core'
import { useEffect, useState } from 'react'

const VISIBLE_MS = 3000

type Props = {
  message: string
  onDismiss: () => void
}

export function ErrorBubble({ message, onDismiss }: Props) {
  const [hovered, setHovered] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    setClosing(false)
  }, [message])

  useEffect(() => {
    if (hovered || closing) return
    const timer = window.setTimeout(() => setClosing(true), VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [hovered, closing, message])

  useEffect(() => {
    if (!closing) return
    const timer = window.setTimeout(onDismiss, 120)
    return () => window.clearTimeout(timer)
  }, [closing, onDismiss])

  return (
    <Paper
      pos="absolute"
      top={4}
      right={16}
      px="sm"
      py={6}
      radius="md"
      shadow="sm"
      withBorder
      className={closing ? 'bubble-out' : 'bubble-in'}
      style={{ zIndex: 400, maxWidth: 420, cursor: 'default' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Text size="sm" c="red.7">
        {message}
      </Text>
    </Paper>
  )
}
