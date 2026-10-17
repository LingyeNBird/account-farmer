import { BrowserWindow, Notification } from 'electron'

/** 窗口未聚焦时才发通知；点击回到窗口。 */
export function notifyUnfocused(title: string, body: string, onClick: () => void): void {
  const window = BrowserWindow.getAllWindows()[0]
  if (!window || window.isFocused()) return
  if (!Notification.isSupported()) return

  const notification = new Notification({ title, body })
  notification.on('click', () => {
    window.show()
    window.focus()
    onClick()
  })
  notification.show()
}
