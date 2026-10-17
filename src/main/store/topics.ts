import { randomUUID } from 'node:crypto'
import type { Topic, TopicDraft } from '@shared/types'
import { readJson, topicsFile, writeJson } from './paths'
import { activateTopicIn, archiveTopicIn, type TopicsState } from './topicsOps'

type TopicsFile = TopicsState

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

/** 归档主题；若它正是进行中的主题，自动把下一个未开始的主题置为进行中。 */
export async function archiveTopic(accountId: string, topicId: string): Promise<Topic[]> {
  const file = await load(accountId)
  if (archiveTopicIn(file, topicId, Date.now())) {
    await writeJson(topicsFile(accountId), file)
  }
  return listTopics(accountId)
}

/** 把某个未开始的主题切成进行中，原有进行中的主题归档。 */
export async function activateTopic(accountId: string, topicId: string): Promise<Topic[]> {
  const file = await load(accountId)
  if (!file.queue.some((item) => item.id === topicId)) {
    throw new Error('主题不存在或已归档')
  }
  if (activateTopicIn(file, topicId, Date.now())) {
    await writeJson(topicsFile(accountId), file)
  }
  return listTopics(accountId)
}
