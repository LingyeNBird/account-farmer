import { registerAccountHandlers } from './accounts'
import { registerPromptHandlers } from './prompts'
import { registerSessionHandlers } from './session'
import { registerSettingsHandlers } from './settings'
import { registerTopicHandlers } from './topics'
import { registerUpdateHandlers } from './update'

export function registerIpcHandlers(): void {
  registerAccountHandlers()
  registerSettingsHandlers()
  registerTopicHandlers()
  registerSessionHandlers()
  registerPromptHandlers()
  registerUpdateHandlers()
}
