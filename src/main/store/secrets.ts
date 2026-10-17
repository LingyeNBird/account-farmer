import { readFile, writeFile } from 'node:fs/promises'
import { safeStorage } from 'electron'
import { secretsFile } from './paths'

function assertEncryption(): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('系统加密服务不可用，无法保存 API Key')
  }
}

export async function setApiKey(key: string): Promise<void> {
  assertEncryption()
  const encrypted = safeStorage.encryptString(key)
  await writeFile(secretsFile(), encrypted.toString('base64'), 'utf-8')
}

export async function getApiKey(): Promise<string | null> {
  try {
    const encoded = await readFile(secretsFile(), 'utf-8')
    return safeStorage.decryptString(Buffer.from(encoded, 'base64'))
  } catch {
    return null
  }
}

export async function hasApiKey(): Promise<boolean> {
  return (await getApiKey()) !== null
}

export async function clearApiKey(): Promise<void> {
  await writeFile(secretsFile(), '', 'utf-8')
}
