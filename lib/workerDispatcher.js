import { Worker } from 'worker_threads'
import { fileURLToPath } from 'url'
import path from 'path'
import os from 'os'

const workerFile = path.join(path.dirname(fileURLToPath(import.meta.url)), 'workerCommand.js')
const maxWorkers = Math.max(1, Math.min(Number(process.env.BOT_WORKERS || os.cpus().length - 1 || 1), 4))
const queue = []
const workers = new Set()
let nextId = 0

function pump() {
while (workers.size < maxWorkers && queue.length) {
const job = queue.shift()
const worker = new Worker(workerFile, { workerData: job.payload })
workers.add(worker)
const done = (error, result) => {
workers.delete(worker)
if (error) job.reject(error)
else job.resolve(result)
pump()
}
worker.once('message', message => done(message?.error ? new Error(message.error) : null, message?.result))
worker.once('error', error => done(error))
worker.once('exit', code => {
if (code !== 0) done(new Error(`worker exited with code ${code}`))
})
}
}

export function runWorkerJob(payload, timeout = 120000) {
return new Promise((resolve, reject) => {
const id = ++nextId
const timer = setTimeout(() => reject(new Error(`worker job ${id} timed out`)), timeout)
queue.push({ payload: { ...payload, id }, resolve: value => { clearTimeout(timer); resolve(value) }, reject: error => { clearTimeout(timer); reject(error) } })
pump()
})
}

export function shouldRunInWorker(plugin, filename = '') {
if (plugin?.worker === true) return true
return /(sticker|stickers|ffmpeg|toimg|tovideo|descarga|descargas|download|video|play)/i.test(filename)
}

export default { runWorkerJob, shouldRunInWorker }
