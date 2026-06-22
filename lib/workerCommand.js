import { parentPort, workerData } from 'worker_threads'
import { pathToFileURL } from 'url'

async function main() {
const replies = []
const module = await import(`${pathToFileURL(workerData.pluginPath).href}?worker=${Date.now()}`)
const plugin = module.default || module
const m = workerData.message
m.reply = async text => replies.push({ type: 'reply', text })
const conn = {
reply: async (chat, text) => replies.push({ type: 'reply', chat, text }),
sendMessage: async (chat, content) => replies.push({ type: 'message', chat, content })
}
const extra = { ...workerData.extra, conn }
await plugin.call(conn, m, extra)
return { replies }
}

main().then(result => parentPort.postMessage({ result })).catch(error => parentPort.postMessage({ error: error?.stack || error?.message || String(error) }))
