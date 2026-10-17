import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createWriteStream, mkdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import { IPC, type UpdateInfo, type UpdateProgress } from '@shared/ipc'
import { broadcast } from '../ipc/broadcast'

const REPO = 'LingyeNBird/account-farmer'
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases/latest`
const USER_AGENT = 'ai-account-nurturing'

type Pending = {
  version: string
  url: string
  name: string
  digest?: string
  size: number
  target: string
}

let pending: Pending | null = null
let downloadedPath: string | null = null
let downloading = false

/** portable 启动器会设置这个变量，指向用户实际双击的 exe；开发模式回落到自身。 */
function targetPath(): string {
  return process.env['PORTABLE_EXECUTABLE_FILE'] || process.execPath
}

function parseVersion(value: string): number[] {
  return value
    .replace(/^v/i, '')
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0)
}

function isNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest)
  const b = parseVersion(current)
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const left = a[i] ?? 0
    const right = b[i] ?? 0
    if (left !== right) return left > right
  }
  return false
}

/** 下载前先确认目标 exe 能替换，省得白下 100MB。 */
function checkWritable(target: string): { ok: boolean; reason?: string } {
  try {
    const info = statSync(target)
    if ((info.mode & 0o200) === 0) return { ok: false, reason: '当前程序文件是只读的' }
  } catch {
    return { ok: false, reason: '找不到当前程序文件' }
  }

  const probe = join(dirname(target), `.ain-write-test-${process.pid}`)
  try {
    writeFileSync(probe, 'ok')
    unlinkSync(probe)
  } catch {
    return { ok: false, reason: '程序所在目录不可写（可能在 Program Files 或受控目录）' }
  }

  return { ok: true }
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  const currentVersion = app.getVersion()
  if (!app.isPackaged) {
    return {
      dev: true,
      currentVersion,
      latestVersion: null,
      available: false,
      canWrite: false,
      size: 0,
      notes: ''
    }
  }

  const response = await fetch(RELEASES_API, {
    headers: { accept: 'application/vnd.github+json', 'user-agent': USER_AGENT }
  })
  if (!response.ok) throw new Error(`检查更新失败（HTTP ${response.status}）`)

  const data = (await response.json()) as {
    tag_name?: string
    body?: string
    assets?: Array<{ name: string; size: number; digest?: string; browser_download_url: string }>
  }

  const latestVersion = String(data.tag_name ?? '').replace(/^v/i, '') || null
  const asset = (data.assets ?? []).find((item) => /^account-farmer-.*\.exe$/i.test(item.name))
  const target = targetPath()
  const writable = checkWritable(target)
  const available = Boolean(latestVersion && isNewer(latestVersion, currentVersion))

  pending =
    available && latestVersion && asset
      ? {
          version: latestVersion,
          url: asset.browser_download_url,
          name: asset.name,
          digest: asset.digest,
          size: asset.size,
          target
        }
      : null
  downloadedPath = null

  return {
    dev: false,
    currentVersion,
    latestVersion,
    available,
    canWrite: writable.ok,
    reason: writable.reason,
    size: asset?.size ?? 0,
    notes: String(data.body ?? '')
  }
}

function emit(progress: UpdateProgress): void {
  broadcast(IPC.updateProgress, progress)
}

export async function downloadUpdate(): Promise<void> {
  if (downloading) throw new Error('正在下载中')
  if (!pending) throw new Error('没有可用的更新，请先检查')

  downloading = true
  const directory = join(tmpdir(), 'ain-update')
  mkdirSync(directory, { recursive: true })
  const destination = join(directory, pending.name)

  try {
    const response = await fetch(pending.url, {
      headers: { accept: 'application/octet-stream', 'user-agent': USER_AGENT }
    })
    if (!response.ok || !response.body) throw new Error(`下载失败（HTTP ${response.status}）`)

    const total = Number(response.headers.get('content-length') ?? 0) || pending.size
    const file = createWriteStream(destination)
    const hash = createHash('sha256')
    let received = 0
    let lastEmit = 0

    const reader = response.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = Buffer.from(value)
      received += chunk.length
      hash.update(chunk)
      if (!file.write(chunk)) {
        await new Promise<void>((resolve) => file.once('drain', () => resolve()))
      }
      const now = Date.now()
      if (now - lastEmit > 200) {
        lastEmit = now
        emit({ state: 'downloading', received, total })
      }
    }

    await new Promise<void>((resolve, reject) => {
      file.once('close', () => resolve())
      file.once('error', reject)
      file.end()
    })

    const digest = hash.digest('hex')
    if (pending.digest?.startsWith('sha256:') && pending.digest.slice(7) !== digest) {
      throw new Error('下载校验失败，文件可能不完整')
    }

    downloadedPath = destination
    emit({ state: 'ready', received, total })
  } finally {
    downloading = false
  }
}

export function installUpdate(): void {
  if (!pending || !downloadedPath) throw new Error('没有已下载的更新')

  const script = join(tmpdir(), 'ain-update', 'swap.ps1')
  const quote = (value: string): string => `'${value.replace(/'/g, "''")}'`
  const lines = [
    "$ErrorActionPreference = 'Stop'",
    `$target = ${quote(pending.target)}`,
    `$source = ${quote(downloadedPath)}`,
    '$backup = "$target.old"',
    `Wait-Process -Id ${process.pid} -ErrorAction SilentlyContinue`,
    'Start-Sleep -Milliseconds 600',
    'try {',
    '  if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Force }',
    '  Copy-Item -LiteralPath $target -Destination $backup -Force',
    '  Copy-Item -LiteralPath $source -Destination $target -Force',
    '  Start-Process -FilePath $target',
    '} catch {',
    '  if (Test-Path -LiteralPath $backup) { Copy-Item -LiteralPath $backup -Destination $target -Force }',
    '  throw',
    '}'
  ]
  writeFileSync(script, lines.join('\r\n'), 'utf8')

  const child = spawn(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', script],
    { detached: true, stdio: 'ignore', windowsHide: true }
  )
  child.unref()

  setTimeout(() => app.quit(), 300)
}
