import {
  Badge,
  Box,
  Button,
  Grid,
  Group,
  NavLink,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Textarea
} from '@mantine/core'
import { useEffect, useState } from 'react'
import {
  DEFAULT_PROMPTS,
  PROMPT_CONDITIONS,
  PROMPT_KEYS,
  PROMPT_LABELS,
  PROMPT_SCOPES,
  PROMPT_VARIABLES,
  type PromptKey
} from '@shared/defaults'
import type { PromptMap } from '@shared/ipc'
import { api } from '../api'
import { PageHead } from '../components/PageHead'

export function Prompts() {
  const [prompts, setPrompts] = useState<PromptMap | null>(null)
  const [selected, setSelected] = useState<PromptKey>('system')
  const [draft, setDraft] = useState('')

  useEffect(() => {
    void api.getPrompts().then((loaded) => {
      setPrompts(loaded)
      setDraft(loaded.system)
    })
  }, [])

  const saved = prompts?.[selected] ?? ''
  const dirty = draft !== saved
  const isDefault = saved === DEFAULT_PROMPTS[selected]
  const scope = PROMPT_SCOPES[selected]
  const variables = PROMPT_VARIABLES[selected]
  const condition = PROMPT_CONDITIONS[selected]

  const select = (key: PromptKey): void => {
    setSelected(key)
    setDraft(prompts?.[key] ?? '')
  }

  const save = async (): Promise<void> => {
    const next = await api.savePrompt(selected, draft)
    setPrompts(next)
    setDraft(next[selected])
  }

  const reset = async (): Promise<void> => {
    const next = await api.resetPrompt(selected)
    setPrompts(next)
    setDraft(next[selected])
  }

  return (
    <Box style={{ padding: '18px 22px 26px' }}>
      <Stack gap="md">
        <PageHead title="提示词" />

        <Grid gap="lg">
          <Grid.Col span={3}>
            <Paper withBorder radius="md" p={6}>
              <Stack gap={2}>
                {PROMPT_KEYS.map((key) => (
                  <NavLink
                    key={key}
                    active={key === selected}
                    color="indigo"
                    onClick={() => select(key)}
                    label={PROMPT_LABELS[key]}
                    description={
                      <Group gap={4} mt={2}>
                        <Badge variant="light" color="gray" radius="sm">
                          {PROMPT_SCOPES[key] === 'global' ? '全局' : '条件'}
                        </Badge>
                      </Group>
                    }
                  />
                ))}
              </Stack>
            </Paper>
          </Grid.Col>

          <Grid.Col span={9}>
            <Paper withBorder radius="md">
              <Group justify="space-between" px="md" py="sm" style={{ borderBottom: '1px solid #efeff2' }}>
                <Group gap="sm">
                  <Text size="sm" fw={600}>
                    {PROMPT_LABELS[selected]}
                  </Text>
                  <Badge variant="light" color="gray" radius="sm">
                    {scope === 'global' ? '全局' : '条件'}
                  </Badge>
                  {condition && (
                    <Text size="xs" c="dimmed">
                      {condition}
                    </Text>
                  )}
                </Group>
                <Button variant="default" size="compact-sm" disabled={isDefault} onClick={() => void reset()}>
                  恢复默认
                </Button>
              </Group>

              <Box px="md" py="sm">
                <Box style={{ border: '1px solid #e0e0e5', borderRadius: 8 }}>
                  <ScrollArea h={420} type="auto">
                    <Box p={10}>
                      <Textarea
                        value={draft}
                        onChange={(event) => setDraft(event.currentTarget.value)}
                        autosize
                        minRows={14}
                        spellCheck={false}
                        variant="unstyled"
                        styles={{
                          input: {
                            fontFamily: "'Cascadia Mono', Consolas, 'Microsoft YaHei UI Light', monospace",
                            fontSize: 15,
                            lineHeight: 1.7,
                            padding: 0
                          }
                        }}
                      />
                    </Box>
                  </ScrollArea>
                </Box>
                {variables.length > 0 && (
                  <Group gap={6} mt="xs">
                    <Text size="xs" c="dimmed">
                      可用变量
                    </Text>
                    {variables.map((name) => (
                      <Badge key={name} variant="light" color="gray" radius="sm">
                        {`{{${name}}}`}
                      </Badge>
                    ))}
                  </Group>
                )}
              </Box>

              <Group justify="flex-end" gap="xs" px="md" pb="md">
                <Button variant="default" disabled={!dirty} onClick={() => setDraft(saved)}>
                  放弃更改
                </Button>
                <Button disabled={!dirty} onClick={() => void save()}>
                  保存
                </Button>
              </Group>
            </Paper>
          </Grid.Col>
        </Grid>
      </Stack>
    </Box>
  )
}
