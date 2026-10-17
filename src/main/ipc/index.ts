import { registerAccountHandlers } from './accounts'
import { registerSettingsHandlers } from './settings'
import { registerTopicHandlers } from './topics'

export function registerIpcHandlers(): void {
  registerAccountHandlers()
  registerSettingsHandlers()
  registerTopicHandlers()
}
