import { Worker } from 'worker_threads'
import { fileURLToPath } from 'url'
import path from 'path'
import os from 'os'
import pkg from '@whiskeysockets/baileys'
const { prepareWAMessageMedia, proto } = pkg
const workerFile = path.join(path.dirname(fileURLToPath(import.meta.url)), 'workerCommand.js')
const maxWorkers = Math.max(1, Math.min(Number(process.env.BOT_WORKERS || os.cpus().length - 1 || 1), 4))
const queue = []
const workers = new Set()
let nextId = 0
async function runMainEvent(event, ctx) {
if (!event || !ctx?.conn || !ctx?.m) return
if (event.type === 'react') return ctx.m.react(event.emoji)
if (event.type === 'reply') return ctx.conn.reply(event.chat || ctx.m.chat, event.text, ctx.m)
if (event.type === 'message') return ctx.conn.sendMessage(event.chat || ctx.m.chat, event.content, { quoted: ctx.m })
if (event.type === 'ellenCard') return sendEllenCardFromMain(ctx.conn, ctx.m, event.text, event.imageUrl, event.buttons)
}
async function sendEllenCardFromMain(conn, m, text, imageUrl, buttons = []) {
const newsletterJid = '120363418071540900@newsletter'
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice'
const mediaConfig = imageUrl ? { image: { url: imageUrl } } : { image: global.icons }
const media = await prepareWAMessageMedia(mediaConfig, { upload: conn.waUploadToServer })
const interactiveObj = {
body: proto.Message.InteractiveMessage.Body.create({ text }),
footer: proto.Message.InteractiveMessage.Footer.create({ text: 'Victoria Housekeeping Service' }),
header: proto.Message.InteractiveMessage.Header.create({
title: '𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice 🦈',
hasMediaAttachment: true,
...media
}),
contextInfo: {
isForwarded: true,
forwardingScore: 999,
forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 }
}
}
if (buttons.length > 0) interactiveObj.nativeFlowMessage = proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons })
const message = {
viewOnceMessage: {
message: {
messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
interactiveMessage: proto.Message.InteractiveMessage.create(interactiveObj)
}
}
}
await conn.relayMessage(m.chat, message, { quoted: m })
}
function pump() {
while (workers.size < maxWorkers && queue.length) {
const job = queue.shift()
const worker = new Worker(workerFile, { workerData: job.payload })
workers.add(worker)
let finished = false
const done = (error, result) => {
if (finished) return
finished = true
workers.delete(worker)
if (error) job.reject(error)
else job.resolve(result)
pump()
}
worker.on('message', async message => {
try {
if (message?.event) return await runMainEvent(message.event, job.ctx)
done(message?.error ? new Error(message.error) : null, message?.result)
} catch (error) {
done(error)
}
})
worker.once('error', error => done(error))
worker.once('exit', code => {
if (code !== 0) done(new Error(`worker exited with code ${code}`))
})
}
}
export function runWorkerJob(payload, timeout = 120000, ctx = {}) {
return new Promise((resolve, reject) => {
const id = ++nextId
const timer = setTimeout(() => reject(new Error(`worker job ${id} timed out`)), timeout)
queue.push({ payload: { ...payload, id }, ctx, resolve: value => { clearTimeout(timer); resolve(value) }, reject: error => { clearTimeout(timer); reject(error) } })
pump()
})
}
export function shouldRunInWorker(plugin, filename = '') {
if (plugin?.worker === true) return true
return /(sticker|stickers|ffmpeg|toimg|tovideo|descarga|descargas|download|video|play)/i.test(filename)
}
export default { runWorkerJob, shouldRunInWorker }
