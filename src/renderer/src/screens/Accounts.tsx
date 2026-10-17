import {
  ActionIcon,
  Alert,
  Avatar,
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  Title
} from '@mantine/core'
import { IconPencil, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import type { AccountSummary } from '@shared/types'
import { ContentModal } from '../components/ContentModal'
import { useAppStore } from '../store'

const formatTime = (value: number): string =>
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(value)

type RenameTarget = { id: string; name: string }

export function Accounts() {
  const accounts = useAppStore((state) => state.accounts)
  const currentAccountId = useAppStore((state) => state.currentAccountId)
  const error = useAppStore((state) => state.error)
  const clearError = useAppStore((state) => state.clearError)
  const createAccount = useAppStore((state) => state.createAccount)
  const renameAccount = useAppStore((state) => state.renameAccount)
  const deleteAccount = useAppStore((state) => state.deleteAccount)
  const selectAccount = useAppStore((state) => state.selectAccount)

  const [draftName, setDraftName] = useState('')
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AccountSummary | null>(null)

  const submitCreate = async (): Promise<void> => {
    const name = draftName.trim()
    if (!name) return
    await createAccount(name)
    setDraftName('')
  }

  const submitRename = async (): Promise<void> => {
    if (!renameTarget) return
    const name = renameTarget.name.trim()
    if (name) await renameAccount(renameTarget.id, name)
    setRenameTarget(null)
  }

  const confirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return
    await deleteAccount(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <Box pos="relative" mih="100%" style={{ padding: '18px 22px 26px' }}>
      <Stack gap="md">
        <Title order={4}>账号管理</Title>

        <Group gap="xs" align="flex-end">
          <TextInput
            placeholder="账号名称"
            value={draftName}
            w={260}
            onChange={(event) => setDraftName(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void submitCreate()
            }}
          />
          <Button onClick={() => void submitCreate()} disabled={!draftName.trim()}>
            新建
          </Button>
        </Group>

        {error && (
          <Alert color="red" variant="light" withCloseButton onClose={clearError}>
            {error}
          </Alert>
        )}

        <Paper withBorder radius="md">
          <Table verticalSpacing="sm" horizontalSpacing="md">
            <Table.Tbody>
              {accounts.map((account) => (
                <Table.Tr key={account.id}>
                  <Table.Td w={44}>
                    <Avatar size={28} radius="xl" color="indigo">
                      {account.name.slice(0, 1).toUpperCase()}
                    </Avatar>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Text size="sm" fw={600}>
                        {account.name}
                      </Text>
                      {account.id === currentAccountId && (
                        <Text size="xs" c="indigo.7">
                          当前
                        </Text>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">
                      主题 {account.topicCount}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">
                      已完成 {account.archivedCount}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">
                      {formatTime(account.lastActiveAt)}
                    </Text>
                  </Table.Td>
                  <Table.Td w={96}>
                    <Group gap={4} justify="flex-end" wrap="nowrap">
                      {account.id !== currentAccountId && (
                        <Button
                          variant="light"
                          size="compact-xs"
                          onClick={() => void selectAccount(account.id)}
                        >
                          切换
                        </Button>
                      )}
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        aria-label="重命名"
                        onClick={() => setRenameTarget({ id: account.id, name: account.name })}
                      >
                        <IconPencil size={15} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        aria-label="删除"
                        onClick={() => setDeleteTarget(account)}
                      >
                        <IconTrash size={15} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>

      {renameTarget && (
        <ContentModal
          title="重命名账号"
          confirmLabel="保存"
          onConfirm={() => void submitRename()}
          onCancel={() => setRenameTarget(null)}
        >
          <TextInput
            value={renameTarget.name}
            autoFocus
            onChange={(event) => setRenameTarget({ ...renameTarget, name: event.currentTarget.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void submitRename()
            }}
          />
        </ContentModal>
      )}

      {deleteTarget && (
        <ContentModal
          title={`删除账号 ${deleteTarget.name}`}
          confirmLabel="删除"
          danger
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        >
          <Text size="sm" c="dimmed">
            该账号下的主题与对话会一并删除。
          </Text>
        </ContentModal>
      )}
    </Box>
  )
}
