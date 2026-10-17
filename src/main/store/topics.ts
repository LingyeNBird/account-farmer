import { randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'
import type { Topic, TopicDraft } from '@shared/types'
import { readJson, sessionFile, topicsFile, writeJson } from './paths'
import { activateTopicIn, archiveTopicIn, promoteNext, type TopicsState } from './topicsOps'

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

/** 彻底删除主题及其会话；进行中的主题被删时，把下一个未开始的主题置为进行中。 */
export async function deleteTopic(accountId: string, topicId: string): Promise<Topic[]> {
  const file = await load(accountId)

  const queueIndex = file.queue.findIndex((item) => item.id === topicId)
  const historyIndex = file.history.findIndex((item) => item.id === topicId)
  if (queueIndex === -1 && historyIndex === -1) throw new Error('主题不存在')

  const removed =
    queueIndex !== -1
      ? file.queue.splice(queueIndex, 1)[0]
      : file.history.splice(historyIndex, 1)[0]

  if (removed.status === 'active') promoteNext(file)

  await writeJson(topicsFile(accountId), file)
  await rm(sessionFile(accountId, topicId), { force: true })
  return listTopics(accountId)
}

/** 更新主题的开场白。 */
export async function updateTopicOpening(
  accountId: string,
  topicId: string,
  openingEn: string,
  openingZh: string
): Promise<Topic[]> {
  const file = await load(accountId)
  const topic = [...file.queue, ...file.history].find((item) => item.id === topicId)
  if (!topic) throw new Error('主题不存在')

  topic.openingEn = openingEn
  topic.openingZh = openingZh
  await writeJson(topicsFile(accountId), file)
  return listTopics(accountId)
}
