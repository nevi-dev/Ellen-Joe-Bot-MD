export function createMessageQueue(handler, options = {}) {
  const queue = []
  const processed = new Map()
  const maxSize = options.maxSize || 1000
  const timeoutMs = options.timeoutMs || 45000
  const dedupeTtlMs = options.dedupeTtlMs || 10 * 60 * 1000
  const cleanupIntervalMs = options.cleanupIntervalMs || 5 * 60 * 1000
  let running = false

  const cleanup = () => {
    const now = Date.now()
    for (const [id, expiresAt] of processed) {
      if (expiresAt <= now) processed.delete(id)
    }
  }

  const cleanupTimer = setInterval(cleanup, cleanupIntervalMs)
  cleanupTimer.unref?.()

  const withTimeout = (job, label) => {
    let timer
    return Promise.race([
      job(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} excedió ${timeoutMs}ms`)), timeoutMs)
        timer.unref?.()
      })
    ]).finally(() => {
      if (timer) clearTimeout(timer)
    })
  }

  const drain = async () => {
    if (running) return
    running = true
    while (queue.length) {
      const { context, chatUpdate } = queue.shift()
      const message = chatUpdate?.messages?.[chatUpdate.messages.length - 1]
      const id = message?.key?.id || message?.id
      if (id && processed.has(id)) continue
      if (id) processed.set(id, Date.now() + dedupeTtlMs)
      try {
        await withTimeout(() => handler.call(context, chatUpdate), `messages.upsert ${id || 'sin-id'}`)
      } catch (error) {
        console.error('[message-queue] Error procesando mensaje:', error?.message || error)
      }
      await new Promise((resolve) => setImmediate(resolve))
    }
    running = false
  }

  const queuedHandler = function queuedHandler(chatUpdate) {
    if (queue.length >= maxSize) {
      console.warn(`[message-queue] Cola llena (${maxSize}); mensaje descartado para evitar cuelgue`)
      return
    }
    queue.push({ context: this, chatUpdate })
    void drain()
  }

  queuedHandler.stop = () => clearInterval(cleanupTimer)
  queuedHandler.stats = () => ({ queueSize: queue.length, processedSize: processed.size, running })
  queuedHandler.raw = handler
  return queuedHandler
}
