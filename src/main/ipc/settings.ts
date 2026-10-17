import { IPC } from '@shared/ipc'
import { loadSettings } from '../store/settings'
import { handle } from './handle'

export function registerSettingsHandlers(): void {
  handle(IPC.settingsGet, () => loadSettings())
}
