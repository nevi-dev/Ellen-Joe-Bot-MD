import { parentPort, workerData } from 'worker_threads'
import path from 'path'
import { coreLog } from './connection-utils.js'

const sessions = workerData.sessions || []
const maxReconnectAttempts = workerData.maxReconnectAttempts || 10
const reconnectDelayMs = workerData.reconnectDelayMs || 10_000
const attempts = new Map()
const active = new Map()

function emitLog(message, level = 'info', scope = 'Worker') {
  parentPort?.postMessage({ type: 'log', scope, message, level })
}

function closeSession(session, reason) {
  const state = active.get(session)
  try { state?.auth?.closeDb?.() } catch (error) { emitLog(`SQLite ${path.basename(session)}: ${error.message}`, 'warn') }
  try { state?.sock?.ws?.close?.() } catch {}
  active.delete(session)
  parentPort?.postMessage({ type: 'fatal-session', session, reason })
}

export function handleSubBotConnectionUpdate(session, update = {}) {
  const code = update.lastDisconnect?.error?.output?.statusCode || update.lastDisconnect?.error?.output?.payload?.statusCode
  if (update.connection === 'open') {
    attempts.set(session, 0)
    emitLog(`${path.basename(session)} conectado.`, 'ok', 'Sub-bots')
    return
  }
  if (update.connection !== 'close') return
  if (code === 401) {
    closeSession(session, '401 Unauthorized / Logged Out')
    return
  }
  const nextAttempt = (attempts.get(session) || 0) + 1
  attempts.set(session, nextAttempt)
  if (nextAttempt > maxReconnectAttempts) {
    closeSession(session, `sin conexión tras ${maxReconnectAttempts} reintentos`)
    return
  }
  emitLog(`${path.basename(session)} desconectado (${code || 'sin código'}); reintento ${nextAttempt}/${maxReconnectAttempts} en ${reconnectDelayMs / 1000}s.`, 'warn', 'Sub-bots')
  setTimeout(() => global.gc?.(), Math.min(1000, reconnectDelayMs)).unref()
}

sessions.forEach((session) => active.set(session, { startedAt: Date.now() }))
coreLog('Worker', `Hilo preparado para ${sessions.length} sesión(es): ${sessions.map((s) => path.basename(s)).join(', ')}`, 'ok')
emitLog(`GC ${global.gc ? 'disponible' : 'no expuesto'} • cachés por sub-bot limitadas por proceso.`, 'info')
setInterval(() => global.gc?.(), 60_000).unref()
