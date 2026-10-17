import { registerAccountHandlers } from './accounts'
import { registerSessionHandlers } from './session'
import { registerSettingsHandlers } from './settings'
import { registerTopicHandlers } from './topics'

export function registerIpcHandlers(): void {
  registerAccountHandlers()
  registerSettingsHandlers()
  registerTopicHandlers()
  registerSessionHandlers()
}
