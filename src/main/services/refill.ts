import { IPC } from '@shared/ipc'
import { broadcast } from '../ipc/broadcast'
import { getApiKey } from '../store/secrets'
import { loadSettings } from '../store/settings'
import { appendTopics, listTopics } from '../store/topics'
import { buildModel } from './llm'
import { notifyUnfocused } from './notify'
import { generateTopics } from './topicBatch'

const REFILL_COUNT = 12

const running = new Set<string>()

async function run(accountId: string): Promise<void> {
  const settings = await loadSettings()
  const apiKey = await getApiKey()
  if (!apiKey) {
    running.delete(accountId)
    broadcast(IPC.refillState, { accountId, state: 'failed' })
    return
  }

  const model = await buildModel(settings.provider)
  const existing = await listTopics(accountId)
  broadcast(IPC.refillState, { accountId, state: 'running' })

  try {
    const drafts = await generateTopics({
      model,
      apiKey,
      count: REFILL_COUNT,
      existingTitles: existing.map((topic) => topic.title),
      signal: new AbortController().signal,
      onChunk: () => undefined
    })
    await appendTopics(accountId, drafts)
    broadcast(IPC.refillState, { accountId, state: 'done' })
    notifyUnfocused('主题补充完成', `新增 ${drafts.length} 个讨论主题`, () =>
      broadcast(IPC.refillFocus, { accountId })
    )
  } catch (error) {
    console.warn('[refill] 失败:', error instanceof Error ? error.message : String(error))
    broadcast(IPC.refillState, { accountId, state: 'failed' })
  } finally {
    running.delete(accountId)
  }
}

/** 队列里没有未开始的主题时，后台补一批。 */
export function maybeStartRefill(accountId: string): void {
  if (running.has(accountId)) return
  void (async () => {
    const topics = await listTopics(accountId)
    if (topics.length === 0) return
    if (topics.some((topic) => topic.status === 'pending')) return
    startRefill(accountId)
  })()
}

export function startRefill(accountId: string): void {
  if (running.has(accountId)) return
  running.add(accountId)
  void run(accountId)
}

export function isRefilling(accountId: string): boolean {
  return running.has(accountId)
}
