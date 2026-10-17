import { ipcMain } from 'electron'
import type { IpcResult } from '@shared/ipc'

export function handle<Args extends unknown[], Result>(
  channel: string,
  run: (...args: Args) => Promise<Result>
): void {
  ipcMain.handle(channel, async (_event, ...args): Promise<IpcResult<Result>> => {
    try {
      return { ok: true, data: await run(...(args as Args)) }
    } catch (error) {
      return {
        ok: false,
        code: (error as NodeJS.ErrnoException).code ?? 'unknown',
        message: error instanceof Error ? error.message : String(error)
      }
    }
  })
}
