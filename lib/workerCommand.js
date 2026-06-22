import { parentPort, workerData } from 'worker_threads'
import { pathToFileURL } from 'url'
import { hydrateWorkerGlobals } from './workerGlobals.js'
import '../settings.js'
const emit = event => parentPort.postMessage({ event })
async function main() {
hydrateWorkerGlobals(workerData.globals)
const module = await import(`${pathToFileURL(workerData.pluginPath).href}?worker=${Date.now()}`)
const plugin = module.default || module
const m = workerData.message
m.reply = async text => emit({ type: 'reply', chat: m.chat, text })
m.react = async emoji => emit({ type: 'react', emoji })
const conn = {
isWorkerProxy: true,
reply: async (chat, text) => emit({ type: 'reply', chat, text }),
sendMessage: async (chat, content) => emit({ type: 'message', chat, content }),
relayMessage: async (chat, content) => emit({ type: 'message', chat, content }),
sendEllenCard: async (chat, text, imageUrl, buttons) => emit({ type: 'ellenCard', chat, text, imageUrl, buttons })
}
const extra = { ...workerData.extra, conn }
await plugin.call(conn, m, extra)
return { ok: true }
}
main().then(result => parentPort.postMessage({ result })).catch(error => parentPort.postMessage({ error: error?.stack || error?.message || String(error) }))
