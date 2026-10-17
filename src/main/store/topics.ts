import { randomUUID } from 'node:crypto'
import type { Topic, TopicDraft } from '@shared/types'
import { readJson, topicsFile, writeJson } from './paths'

type TopicsFile = {
  queue: Topic[]
  history: Topic[]
}

const EMPTY: TopicsFile = { queue: [], history: [] }

async function load(accountId: string): Promise<TopicsFile> {
  return readJson<TopicsFile>(topicsFile(accountId), EMPTY)
}

export async function listTopics(accountId: string): Promise<Topic[]> {
  const file = await load(accountId)
  return [...file.queue, ...file.history].sort((a, b) => a.seq - b.seq)
}

export async function appendTopics(accountId: string, drafts: TopicDraft[]): Promise<Topic[]> {
  const file = await load(accountId)
  const nextSeq = [...file.queue, ...file.history].reduce((max, topic) => Math.max(max, topic.seq), 0) + 1
  const batchId = randomUUID()
  const now = Date.now()

  const created: Topic[] = drafts.map((draft, index) => ({
    id: randomUUID(),
    seq: nextSeq + index,
    batchId,
    title: draft.title,
    domains: draft.domains,
    openingEn: draft.openingEn,
    openingZh: draft.openingZh,
    status: 'pending',
    createdAt: now
  }))

  const hasActive = file.queue.some((topic) => topic.status === 'active')
  if (!hasActive && created.length > 0) created[0].status = 'active'

  file.queue.push(...created)
  await writeJson(topicsFile(accountId), file)
  return listTopics(accountId)
}
