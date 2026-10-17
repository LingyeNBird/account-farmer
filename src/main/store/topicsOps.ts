import type { Topic } from '@shared/types'

export type TopicsState = {
  queue: Topic[]
  history: Topic[]
}

function takeFromQueue(state: TopicsState, topicId: string): Topic | undefined {
  const index = state.queue.findIndex((topic) => topic.id === topicId)
  if (index === -1) return undefined
  return state.queue.splice(index, 1)[0]
}

function archiveInto(state: TopicsState, topic: Topic, now: number): void {
  topic.status = 'archived'
  topic.archivedAt = now
  state.history.push(topic)
}

export function promoteNext(state: TopicsState): void {
  if (state.queue.some((topic) => topic.status === 'active')) return
  const next = state.queue.find((topic) => topic.status === 'pending')
  if (next) next.status = 'active'
}

/** 归档一个队列中的主题；若它是进行中的那个，自动提拔下一个未开始的。 */
export function archiveTopicIn(state: TopicsState, topicId: string, now: number): boolean {
  const topic = takeFromQueue(state, topicId)
  if (!topic) return false
  archiveInto(state, topic, now)
  promoteNext(state)
  return true
}

/** 把未开始的主题切成进行中；原有进行中的主题归档。 */
export function activateTopicIn(state: TopicsState, topicId: string, now: number): boolean {
  const target = state.queue.find((topic) => topic.id === topicId)
  if (!target || target.status === 'active') return false

  const current = state.queue.find((topic) => topic.status === 'active')
  if (current && current.id !== target.id) {
    const archived = takeFromQueue(state, current.id)
    if (archived) archiveInto(state, archived, now)
  }

  target.status = 'active'
  return true
}
