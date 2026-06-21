const DEFAULT_MAX_AGE_SECONDS = 15

export function getMessageTimestampMs(message) {
  const timestamp = message?.messageTimestamp
  if (!timestamp) return Date.now()
  if (typeof timestamp === 'number') return timestamp * 1000
  if (typeof timestamp === 'bigint') return Number(timestamp) * 1000
  if (typeof timestamp?.toNumber === 'function') return timestamp.toNumber() * 1000
  const parsed = Number(timestamp)
  return Number.isFinite(parsed) ? parsed * 1000 : Date.now()
}

export function isStaleMessage(message, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) {
  const ageMs = Date.now() - getMessageTimestampMs(message)
  return ageMs > maxAgeSeconds * 1000
}

export function filterFreshMessages(upsert, options = {}) {
  if (!upsert?.messages?.length) return upsert
  const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS
  const messages = upsert.messages.filter((message) => {
    if (message?.key?.fromMe) return true
    if (message?.messageStubType) return false
    return !isStaleMessage(message, maxAgeSeconds)
  })
  return messages.length ? { ...upsert, messages } : null
}
