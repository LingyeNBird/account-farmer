import { Paper, Text } from '@mantine/core'
import { useEffect, useState } from 'react'

const VISIBLE_MS = 3000

type Props = {
  message: string
  onDismiss: () => void
}

export function ErrorBubble({ message, onDismiss }: Props) {
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (hovered) return
    const timer = window.setTimeout(onDismiss, VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [hovered, message, onDismiss])

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
