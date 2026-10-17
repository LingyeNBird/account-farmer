/**
 * 把高频的「最新值」压成固定间隔的一次发送。
 *
 * 流式生成时每来一个 token 都会更新一次全文，逐条解析并广播会把开销放大到
 * O(n²)。这里只保留最新值，最多每 `interval` 毫秒发一次；结束时 flush 补上
 * 最后一帧，避免收尾那半秒的画面停在上一个节流点。
 */
export function createEmitThrottle<T>(
  emit: (value: T) => void,
  interval: number
): { push: (value: T) => void; end: () => void } {
  let last = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: { value: T } | null = null

  const flush = (): void => {
    if (!pending) return
    const { value } = pending
    pending = null
    last = Date.now()
    emit(value)
  }

  return {
    push(value) {
      const now = Date.now()
      const elapsed = now - last
      if (elapsed >= interval) {
        pending = null
        last = now
        emit(value)
        return
      }
      pending = { value }
      if (timer) return
      timer = setTimeout(() => {
        timer = null
        flush()
      }, interval - elapsed)
      timer.unref?.()
    },
    end() {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      flush()
    }
  }
}
