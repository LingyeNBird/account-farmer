import { IPC } from '@shared/ipc'
import { buildModel } from '../services/llm'
import { generateTopics } from '../services/topicBatch'
import { getApiKey } from '../store/secrets'
import { loadSettings } from '../store/settings'
import { appendTopics, archiveTopic, activateTopic, listTopics } from '../store/topics'
import { broadcast } from './broadcast'
import { handle } from './handle'

const controllers = new Map<string, AbortController>()

const FIRST_BATCH_SIZE = 12

export function registerTopicHandlers(): void {
  handle(IPC.topicsList, (accountId: string) => listTopics(accountId))

  handle(IPC.topicsGenerate, async (accountId: string) => {
    if (controllers.has(accountId)) throw new Error('该账号正在生成主题')

    const settings = await loadSettings()
    const apiKey = await getApiKey()
    if (!apiKey) throw new Error('缺少 API Key')
    const model = await buildModel(settings.provider)

    const existing = await listTopics(accountId)
    const controller = new AbortController()
    controllers.set(accountId, controller)

    try {
      const drafts = await generateTopics({
        model,
        apiKey,
        count: FIRST_BATCH_SIZE,
        existingTitles: existing.map((topic) => topic.title),
        signal: controller.signal,
        onChunk: (drafts) =>
          broadcast(IPC.topicsProgress, {
            accountId,
            generated: drafts.length,
            total: FIRST_BATCH_SIZE,
            titles: drafts.map((draft) => draft.title)
          })
      })
      return await appendTopics(accountId, drafts)
    } catch (error) {
      if (controller.signal.aborted) throw new Error('已取消')
      throw error
    } finally {
      controllers.delete(accountId)
    }
  })

  handle(IPC.topicsCancel, async (accountId: string) => {
    controllers.get(accountId)?.abort()
  })

  handle(IPC.topicsArchive, (accountId: string, topicId: string) => archiveTopic(accountId, topicId))
  handle(IPC.topicsActivate, (accountId: string, topicId: string) => activateTopic(accountId, topicId))
}
