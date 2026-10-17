import { registerAccountHandlers } from './accounts'
import { registerSettingsHandlers } from './settings'

export function registerIpcHandlers(): void {
  registerAccountHandlers()
  registerSettingsHandlers()
}
