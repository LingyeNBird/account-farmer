import { SESSION_VERSION, type Session, type Turn } from '@shared/types'
import { readJson, sessionFile, writeJson } from './paths'

/** v1：每轮把「对方回复」和「我的发言」存在一起，回复在前。 */
type LegacyTurn = {
  index: number
  aiReply: string
  messageEn: string
  messageZh: string
  feedback?: Turn['feedback']
  ended: boolean
  endReason?: string
  createdAt: number
}

type LegacySession = { topicId: string; turns: LegacyTurn[] }

function isLegacy(session: unknown): session is LegacySession {
  if (!session || typeof session !== 'object') return false
  const turns = (session as LegacySession).turns
  return Array.isArray(turns) && turns.some((turn) => 'aiReply' in turn)
}

/**
 * v1 → v2：第 k 轮的 aiReply 是「我这条发言收到的回复」，
 * 所以它应该挂到上一条发言（开场或第 k-1 轮）的 reply 上。
 */
function migrate(legacy: LegacySession): Session {
  const turns: Turn[] = legacy.turns.map((turn, position) => ({
    index: turn.index,
    messageEn: turn.messageEn ?? '',
    messageZh: turn.messageZh ?? '',
    feedback: turn.feedback,
    reply: legacy.turns[position + 1]?.aiReply,
    ended: Boolean(turn.ended),
    endReason: turn.endReason,
    createdAt: turn.createdAt ?? 0
  }))

  return {
    topicId: legacy.topicId,
    version: SESSION_VERSION,
    openingReply: legacy.turns[0]?.aiReply,
    turns
  }
}

export async function loadSession(accountId: string, topicId: string): Promise<Session> {
  const file = sessionFile(accountId, topicId)
  const stored = await readJson<Session | LegacySession>(file, {
    topicId,
    version: SESSION_VERSION,
    turns: []
  })

  if (isLegacy(stored)) {
    const migrated = migrate(stored)
    await writeJson(file, migrated)
    return migrated
  }

  return { ...stored, version: SESSION_VERSION }
}

export async function saveSession(
  accountId: string,
  topicId: string,
  session: Session
): Promise<void> {
  await writeJson(sessionFile(accountId, topicId), { ...session, version: SESSION_VERSION })
}
