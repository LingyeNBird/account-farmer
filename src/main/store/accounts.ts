import { randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'
import type { Account, AccountsState, AccountSummary, Topic } from '@shared/types'
import { accountDir, accountsFile, readJson, topicsFile, writeJson } from './paths'

type AccountsFile = {
  accounts: Account[]
  currentAccountId: string | null
}

const EMPTY: AccountsFile = { accounts: [], currentAccountId: null }

type TopicsFile = {
  queue: Topic[]
  history: Topic[]
}

const load = (): Promise<AccountsFile> => readJson(accountsFile(), EMPTY)

async function summarize(account: Account): Promise<AccountSummary> {
  const topics = await readJson<TopicsFile>(topicsFile(account.id), { queue: [], history: [] })
  const all = [...topics.queue, ...topics.history]
  const lastTopicAt = all.reduce((latest, topic) => Math.max(latest, topic.createdAt), 0)
  return {
    ...account,
    topicCount: all.length,
    archivedCount: all.filter((topic) => topic.status === 'archived').length,
    lastActiveAt: Math.max(account.createdAt, lastTopicAt)
  }
}

export async function listAccounts(): Promise<AccountsState> {
  const file = await load()
  return {
    accounts: await Promise.all(file.accounts.map(summarize)),
    currentAccountId: file.currentAccountId
  }
}

export async function createAccount(name: string): Promise<AccountSummary> {
  const file = await load()
  const account: Account = { id: randomUUID(), name, createdAt: Date.now() }
  file.accounts.push(account)
  file.currentAccountId = account.id
  await writeJson(accountsFile(), file)
  return summarize(account)
}

export async function renameAccount(id: string, name: string): Promise<AccountSummary> {
  const file = await load()
  const account = file.accounts.find((item) => item.id === id)
  if (!account) throw new Error(`账号不存在: ${id}`)
  account.name = name
  await writeJson(accountsFile(), file)
  return summarize(account)
}

export async function deleteAccount(id: string): Promise<void> {
  const file = await load()
  file.accounts = file.accounts.filter((item) => item.id !== id)
  if (file.currentAccountId === id) {
    file.currentAccountId = file.accounts[0]?.id ?? null
  }
  await writeJson(accountsFile(), file)
  await rm(accountDir(id), { recursive: true, force: true })
}

export async function selectAccount(id: string): Promise<void> {
  const file = await load()
  if (!file.accounts.some((item) => item.id === id)) throw new Error(`账号不存在: ${id}`)
  file.currentAccountId = id
  await writeJson(accountsFile(), file)
}
