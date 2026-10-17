import { join } from 'node:path'
import { EMPTY_CADENCE, type FeedbackCadence } from '../services/feedback'
import { accountDir, readJson, writeJson } from './paths'

const file = (accountId: string): string => join(accountDir(accountId), 'feedback.json')

export async function loadFeedbackCadence(accountId: string): Promise<FeedbackCadence> {
  return readJson<FeedbackCadence>(file(accountId), EMPTY_CADENCE)
}

export async function saveFeedbackCadence(
  accountId: string,
  cadence: FeedbackCadence
): Promise<void> {
  await writeJson(file(accountId), cadence)
}
