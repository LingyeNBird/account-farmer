import type { Session, Turn } from '@shared/types'
import { readJson, sessionFile, writeJson } from './paths'

export async function loadSession(accountId: string, topicId: string): Promise<Session> {
  return readJson<Session>(sessionFile(accountId, topicId), { topicId, turns: [] })
}

export async function appendTurn(accountId: string, topicId: string, turn: Turn): Promise<Session> {
  const session = await loadSession(accountId, topicId)
  session.turns.push(turn)
  await writeJson(sessionFile(accountId, topicId), session)
  return session
}
