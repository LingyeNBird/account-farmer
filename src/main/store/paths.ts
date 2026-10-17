import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { app } from 'electron'

const root = (): string => app.getPath('userData')

export const accountsFile = (): string => join(root(), 'accounts.json')
export const settingsFile = (): string => join(root(), 'settings.json')
export const accountDir = (accountId: string): string => join(root(), 'accounts', accountId)
export const topicsFile = (accountId: string): string => join(accountDir(accountId), 'topics.json')
export const sessionsDir = (accountId: string): string => join(accountDir(accountId), 'sessions')
export const sessionFile = (accountId: string, topicId: string): string =>
  join(sessionsDir(accountId), `${topicId}.json`)

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, 'utf-8')) as T
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback
    await rename(file, `${file}.corrupt`).catch(() => undefined)
    return fallback
  }
}

export async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  const temporary = `${file}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf-8')
  await rename(temporary, file)
}
