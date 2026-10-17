import { app } from 'electron'
import { IPC } from '@shared/ipc'
import { checkForUpdate, downloadUpdate, installUpdate } from '../services/updater'
import { handle } from './handle'

export function registerUpdateHandlers(): void {
  handle(IPC.updateVersion, async () => app.getVersion())

  handle(IPC.updateCheck, () => checkForUpdate())

  handle(IPC.updateDownload, async () => {
    await downloadUpdate()
  })

  handle(IPC.updateInstall, async () => {
    installUpdate()
  })
}
