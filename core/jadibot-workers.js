import { Worker } from 'worker_threads'
import path from 'path'
import { fileURLToPath } from 'url'
import { coreLog } from './connection-utils.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export class JadiBotWorkerBalancer {
  constructor({ botsPerWorker = 3 } = {}) {
    this.botsPerWorker = Math.min(3, Math.max(1, botsPerWorker))
    this.workers = new Map()
  }

  start(sessionDirs = []) {
    const chunks = []
    for (let i = 0; i < sessionDirs.length; i += this.botsPerWorker) chunks.push(sessionDirs.slice(i, i + this.botsPerWorker))
    chunks.forEach((sessions, index) => this.spawn(index, sessions))
  }

  spawn(index, sessions) {
    const worker = new Worker(path.join(__dirname, 'jadibot-worker.js'), { workerData: { sessions } })
    this.workers.set(index, worker)
    coreLog('Workers', `Worker #${index + 1} iniciado con ${sessions.length} sub-bot(s).`, 'ok')
    worker.on('exit', (code) => {
      this.workers.delete(index)
      if (code !== 0) {
        coreLog('Workers', `Worker #${index + 1} cayó (${code}); reiniciando lote.`, 'warn')
        this.spawn(index, sessions)
      }
    })
    worker.on('error', (error) => coreLog('Workers', error.message, 'error'))
  }
}
