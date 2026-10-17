import { clipboard } from 'electron'
import { IPC } from '@shared/ipc'
import { generateTurn } from '../services/turn'
import { loadSession } from '../store/sessions'
import { broadcast } from './broadcast'
import { handle } from './handle'

const controllers = new Map<string, AbortController>()

const keyOf = (accountId: string, topicId: string): string => `${accountId}:${topicId}`

export function registerSessionHandlers(): void {
  handle(IPC.sessionGet, (accountId: string, topicId: string) => loadSession(accountId, topicId))

  handle(IPC.sessionGenerate, async (accountId: string, topicId: string, aiReply: string) => {
    if (!aiReply.trim()) throw new Error('回复不能为空')
    const key = keyOf(accountId, topicId)
    if (controllers.has(key)) throw new Error('正在生成')

    const controller = new AbortController()
    controllers.set(key, controller)
    try {
      return await generateTurn({
        accountId,
        topicId,
        aiReply,
        signal: controller.signal,
        onDelta: (text) => broadcast(IPC.sessionDelta, { accountId, topicId, text })
      })
    } finally {
      controllers.delete(key)
    }
  })

  handle(IPC.sessionAbort, async (accountId: string, topicId: string) => {
    controllers.get(keyOf(accountId, topicId))?.abort()
  })

  handle(IPC.clipboardWrite, async (text: string) => {
    clipboard.writeText(text)
  })
}
