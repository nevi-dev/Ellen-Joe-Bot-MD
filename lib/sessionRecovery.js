import path from 'path'
import { readdir, rm } from 'fs/promises'

const AUTH_KEEP_FILES = new Set(['creds.json'])
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000
const DEFAULT_MAX_RESETS = 2
const SESSION_ERROR_PATTERNS = [
  /bad\s*mac/i,
  /decrypt/i,
  /decryption/i,
  /failed\s+to\s+decrypt/i,
  /no\s+session/i,
  /session\s+(record|error|not\s+found|not\s+available|does\s+not\s+exist)/i,
  /invalid\s+pre\s*key/i,
  /pre\s*key/i,
  /sender\s*key/i,
  /app\s*state/i,
  /signal/i,
  /cipher/i,
]

const resetState = globalThis.__ellenSessionRecoveryState || {
  queue: Promise.resolve(),
  lastRunAt: 0,
  attempts: new Map(),
}
globalThis.__ellenSessionRecoveryState = resetState

const errorToText = (error) => {
  if (!error) return ''
  const parts = []
  const visit = (value) => {
    if (!value) return
    if (typeof value === 'string') {
      parts.push(value)
      return
    }
    if (typeof value === 'number') {
      parts.push(String(value))
      return
    }
    if (value.message) parts.push(value.message)
    if (value.stack) parts.push(value.stack)
    if (value.name) parts.push(value.name)
    if (value.output?.payload?.message) parts.push(value.output.payload.message)
    if (value.output?.statusCode) parts.push(String(value.output.statusCode))
    if (value.data) visit(value.data)
    if (value.error) visit(value.error)
    if (value.cause) visit(value.cause)
  }
  visit(error)
  return parts.join('\n')
}

export const isRecoverableSessionError = (error) => {
  const text = errorToText(error)
  return !!text && SESSION_ERROR_PATTERNS.some(pattern => pattern.test(text))
}

export const noteSessionRecoverySignal = (socket, error) => {
  if (!socket || !isRecoverableSessionError(error)) return false
  socket.__sessionRecoverySuspected = true
  socket.__sessionRecoveryReason = errorToText(error).slice(0, 500)
  return true
}

const canRunRecovery = (sessionPath, maxResets) => {
  const now = Date.now()
  const attempt = resetState.attempts.get(sessionPath) || { count: 0, firstAt: now }
  if (now - attempt.firstAt > 60 * 60 * 1000) {
    attempt.count = 0
    attempt.firstAt = now
  }
  if (attempt.count >= maxResets) return false
  attempt.count += 1
  resetState.attempts.set(sessionPath, attempt)
  return true
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const runExclusive = (task, cooldownMs) => {
  const run = async () => {
    const elapsed = Date.now() - resetState.lastRunAt
    if (elapsed < cooldownMs) await wait(cooldownMs - elapsed)
    const result = await task()
    resetState.lastRunAt = Date.now()
    return result
  }
  resetState.queue = resetState.queue.catch(() => {}).then(run)
  return resetState.queue
}

export const softResetAuthSession = async ({
  sessionPath,
  socket,
  label = path.basename(sessionPath || ''),
  logger = console,
  cooldownMs = DEFAULT_COOLDOWN_MS,
  maxResets = DEFAULT_MAX_RESETS,
} = {}) => {
  if (!sessionPath) return { ok: false, reason: 'missing-session-path', deleted: [] }
  if (!canRunRecovery(sessionPath, maxResets)) return { ok: false, reason: 'max-resets-reached', deleted: [] }

  return runExclusive(async () => {
    const deleted = []
    try {
      await socket?.credsUpdate?.flush?.().catch?.(() => {})
      const entries = await readdir(sessionPath, { withFileTypes: true })
      await Promise.all(entries.map(async entry => {
        if (AUTH_KEEP_FILES.has(entry.name)) return
        const filePath = path.join(sessionPath, entry.name)
        await rm(filePath, { recursive: true, force: true })
        deleted.push(entry.name)
      }))
      logger.warn?.(`[session-recovery] Soft reset aplicado a ${label}: ${deleted.length} archivos de llaves eliminados; creds.json preservado.`)
      return { ok: true, reason: 'recovered', deleted }
    } catch (error) {
      logger.error?.(`[session-recovery] Error durante soft reset de ${label}:`, error)
      return { ok: false, reason: 'reset-error', deleted, error }
    }
  }, cooldownMs)
}
