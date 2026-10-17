import { Button, type ButtonProps } from '@mantine/core'
import { IconCheck, IconCopy } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../api'

type Props = ButtonProps & { text: string; label?: string }

export function CopyButton({ text, label = '复制', ...props }: Props) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => () => window.clearTimeout(timer.current ?? undefined), [])

  const copy = async (): Promise<void> => {
    await api.copyText(text)
    setCopied(true)
    window.clearTimeout(timer.current ?? undefined)
    timer.current = window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Button
      variant="default"
      size="compact-sm"
      leftSection={copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
      onClick={() => void copy()}
      {...props}
    >
      {copied ? '已复制' : label}
    </Button>
  )
}
