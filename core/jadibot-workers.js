import { Worker } from 'worker_threads'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { coreLog } from './connection-utils.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MIN_BOTS_PER_WORKER = 1
const MAX_BOTS_PER_WORKER = 3
const MAX_RECONNECT_ATTEMPTS = 10
const RECONNECT_DELAY_MS = 10_000

export class JadiBotWorkerBalancer {
  constructor({ botsPerWorker = MAX_BOTS_PER_WORKER, maxWorkers = os.cpus().length } = {}) {
    this.botsPerWorker = Math.min(MAX_BOTS_PER_WORKER, Math.max(MIN_BOTS_PER_WORKER, botsPerWorker))
    this.maxWorkers = Math.max(1, Math.min(maxWorkers || 1, os.cpus().length || 1))
    this.workers = new Map()
    this.sessionToWorker = new Map()
    this.retryCounters = new Map()
  }

  start(sessionDirs = []) {
    const uniqueSessions = [...new Set(sessionDirs)].filter(Boolean)
    const chunks = []
    for (let i = 0; i < uniqueSessions.length; i += this.botsPerWorker) chunks.push(uniqueSessions.slice(i, i + this.botsPerWorker))
    chunks.slice(0, this.maxWorkers).forEach((sessions, index) => this.spawn(index, sessions))
    if (chunks.length > this.maxWorkers) {
      coreLog('Workers', `${chunks.length - this.maxWorkers} lote(s) en espera: límite físico de ${this.maxWorkers} worker(s).`, 'warn')
    }
  }

  spawn(index, sessions) {
    const safeSessions = sessions.slice(0, this.botsPerWorker)
    const worker = new Worker(path.join(__dirname, 'jadibot-worker.js'), {
      workerData: { sessions: safeSessions, maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS, reconnectDelayMs: RECONNECT_DELAY_MS },
      resourceLimits: { maxOldGenerationSizeMb: 256, maxYoungGenerationSizeMb: 48 }
    })
    this.workers.set(index, { worker, sessions: safeSessions })
    safeSessions.forEach((session) => this.sessionToWorker.set(session, index))
    coreLog('Workers', `Worker #${index + 1} activo • ${safeSessions.length}/${this.botsPerWorker} sub-bot(s) • límite ${this.maxWorkers} hilo(s).`, 'ok')

    worker.on('message', (event) => this.onWorkerMessage(index, event))
    worker.on('exit', (code) => this.onWorkerExit(index, code))
    worker.on('error', (error) => coreLog('Workers', `Worker #${index + 1}: ${error.message}`, 'error'))
  }

  onWorkerMessage(index, event = {}) {
    if (event.type === 'fatal-session') this.dropSession(index, event.session, event.reason)
    if (event.type === 'log') coreLog(event.scope || `Worker #${index + 1}`, event.message, event.level || 'info')
  }

  onWorkerExit(index, code) {
    const meta = this.workers.get(index)
    this.workers.delete(index)
    if (!meta) return
    meta.sessions.forEach((session) => this.sessionToWorker.delete(session))
    if (code === 0) return
    const retries = (this.retryCounters.get(index) || 0) + 1
    this.retryCounters.set(index, retries)
    if (retries > MAX_RECONNECT_ATTEMPTS) {
      coreLog('Workers', `Worker #${index + 1} superó ${MAX_RECONNECT_ATTEMPTS} reintentos; lote dado de baja.`, 'error')
      return
    }
    coreLog('Workers', `Worker #${index + 1} cayó (${code}); reintento ${retries}/${MAX_RECONNECT_ATTEMPTS} en 10s.`, 'warn')
    setTimeout(() => this.spawn(index, meta.sessions), RECONNECT_DELAY_MS).unref()
  }

  dropSession(index, session, reason = 'desconexión permanente') {
    const meta = this.workers.get(index)
    if (!meta) return
    meta.sessions = meta.sessions.filter((item) => item !== session)
    this.sessionToWorker.delete(session)
    coreLog('Workers', `Sub-bot ${path.basename(session)} dado de baja: ${reason}. Slot liberado.`, 'warn')
  }
}
