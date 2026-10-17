import { describe, expect, it } from 'vitest'
import type { Topic } from '@shared/types'
import { activateTopicIn, archiveTopicIn, type TopicsState } from './topicsOps'

const topic = (seq: number, status: Topic['status']): Topic => ({
  id: `t${seq}`,
  seq,
  batchId: 'b',
  title: `主题 ${seq}`,
  domains: ['x'],
  openingEn: '',
  openingZh: '',
  status,
  createdAt: 0
})

const state = (): TopicsState => ({
  queue: [topic(1, 'active'), topic(2, 'pending'), topic(3, 'pending')],
  history: []
})

describe('archiveTopicIn', () => {
  it('归档进行中的主题并提拔下一个未开始的', () => {
    const data = state()
    expect(archiveTopicIn(data, 't1', 100)).toBe(true)
    expect(data.queue.map((item) => `${item.seq}:${item.status}`)).toEqual(['2:active', '3:pending'])
    expect(data.history).toHaveLength(1)
    expect(data.history[0].status).toBe('archived')
    expect(data.history[0].archivedAt).toBe(100)
  })

  it('队列里已有进行中的主题时不再提拔', () => {
    const data = state()
    archiveTopicIn(data, 't2', 100)
    expect(data.queue.map((item) => `${item.seq}:${item.status}`)).toEqual(['1:active', '3:pending'])
  })

  it('主题不在队列中时返回 false', () => {
    const data = state()
    expect(archiveTopicIn(data, 'missing', 100)).toBe(false)
    expect(data.queue).toHaveLength(3)
  })
})

describe('activateTopicIn', () => {
  it('激活未开始的主题并归档原进行中的', () => {
    const data = state()
    expect(activateTopicIn(data, 't3', 200)).toBe(true)
    expect(data.queue.map((item) => `${item.seq}:${item.status}`)).toEqual(['2:pending', '3:active'])
    expect(data.history.map((item) => item.seq)).toEqual([1])
  })

  it('已在进行中时不重复处理', () => {
    const data = state()
    expect(activateTopicIn(data, 't1', 200)).toBe(false)
    expect(data.queue.map((item) => item.status)).toEqual(['active', 'pending', 'pending'])
    expect(data.history).toHaveLength(0)
  })

  it('没有进行中的主题时直接激活', () => {
    const data: TopicsState = { queue: [topic(1, 'pending')], history: [] }
    expect(activateTopicIn(data, 't1', 200)).toBe(true)
    expect(data.queue[0].status).toBe('active')
    expect(data.history).toHaveLength(0)
  })
})
