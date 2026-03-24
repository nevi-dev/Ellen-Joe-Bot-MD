/* 🦈 𝗘𝗟𝗟𝗘𝗡 𝗝𝗢𝗘 - 𝗦𝗘𝗥𝗕𝗢𝗧 𝗨𝗟𝗧𝗥𝗔 𝗢𝗣𝗧𝗜𝗠𝗜𝗭𝗔𝗗𝗢 
   - Funcionalidad: Total (QR + Código)
   - Estabilidad: Alta (Manejo de cierres 408, 428, 500)
   - Antispam: Bloqueo de mensajes repetidos en conexión
*/

const { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestBaileysVersion } = (await import("@whiskeysockets/baileys"));
import qrcode from "qrcode"
import NodeCache from "node-cache"
import fs from "fs"
import path from "path"
import pino from 'pino'
import chalk from 'chalk'
import * as ws from 'ws'
const { exec } = await import('child_process')
import { makeWASocket } from '../lib/simple.js'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const rtx = `*╭─────────────────────*
*| 🦈 𝗘𝗟𝗟𝗘𝗡 𝗝𝗢𝗘 | ACCESO QR*
*| ━━━━━━━━━━━━━━━━━━━━*
*| Escanea este QR para activar tu Sub-Bot.*
*| El código expira en 30 segundos.*
*╰─────────────────────*`

const rtx2 = `*╭─────────────────────*
*| 🎄 𝗘𝗟𝗟𝗘𝗡 𝗝𝗢𝗘 | CÓDIGO*
*| ━━━━━━━━━━━━━━━━━━━━*
*| Ingresa el código que recibirás a*
*| continuación en "Vincular dispositivo".*
*╰─────────────────────*`

if (!(global.conns instanceof Array)) global.conns = []

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = global.db.data.users[m.sender]
    if (!user) global.db.data.users[m.sender] = {}
    
    let time = (user.Subs || 0) + 120000
    if (new Date - (user.Subs || 0) < 120000) return conn.reply(m.chat, `🦈 Aguarda ${msToTime(time - new Date())} para otra vinculación.`, m)
    
    const subBots = global.conns.filter((c) => c.user && c.ws.socket && c.ws.socket.readyState !== ws.CLOSED)
    if (subBots.length >= 90) return m.reply(`❌ Capacidad máxima de Agentes alcanzada.`)

    let id = `${m.sender.split`@`[0]}`
    let pathEllenJadiBot = path.join(`./${jadi}/`, id)
    if (!fs.existsSync(pathEllenJadiBot)) fs.mkdirSync(pathEllenJadiBot, { recursive: true })

    console.log(chalk.bold.blue(`[SISTEMA] Iniciando Agente para: ${id}`))

    EllenJadiBot({ pathEllenJadiBot, m, conn, args, usedPrefix, command })
    user.Subs = new Date * 1
}

handler.help = ['qr', 'code']
handler.tags = ['serbot']
handler.command = ['qr', 'code']
export default handler

export async function EllenJadiBot(options) {
    let { pathEllenJadiBot, m, conn, args, usedPrefix, command } = options
    const mcode = /(--code|code)/.test(args[0]) || /(--code|code)/.test(args[1]) || command === 'code'
    
    let { version } = await fetchLatestBaileysVersion()
    const msgRetryCache = new NodeCache()
    const { state, saveCreds } = await useMultiFileAuthState(pathEllenJadiBot)

    const connectionOptions = {
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: { 
            creds: state.creds, 
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) 
        },
        msgRetryCache,
        browser: ['Ubuntu', 'Chrome', '110.0.5585.95'], 
        version,
        syncFullHistory: false,
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true
    }

    let sock = makeWASocket(connectionOptions)
    
    // --- BLOQUEOS ANTI-SPAM ---
    let qrSent = false
    let codeSent = false
    let welcomeSent = false

    async function connectionUpdate(update) {
        const { connection, lastDisconnect, qr } = update
        
        // Manejo de QR (Evita mandar 200 QRs)
        if (qr && !mcode && !qrSent) {
            qrSent = true
            try {
                let txtQR = await conn.sendMessage(m.chat, { image: await qrcode.toBuffer(qr, { scale: 8 }), caption: rtx }, { quoted: m })
                setTimeout(() => { conn.sendMessage(m.chat, { delete: txtQR.key }).catch(() => {}) }, 30000)
            } catch { qrSent = false }
        }

        // Manejo de Código (Evita mandar 200 códigos)
        if (qr && mcode && !codeSent) {
            codeSent = true
            await conn.sendMessage(m.chat, { text: rtx2 }, { quoted: m })
            try {
                let secret = await sock.requestPairingCode(m.sender.split`@`[0])
                secret = secret.match(/.{1,4}/g)?.join("-") || secret
                let codeBot = await m.reply(secret)
                setTimeout(() => { conn.sendMessage(m.chat, { delete: codeBot.key }).catch(() => {}) }, 35000)
            } catch { codeSent = false }
        }

        if (connection === 'open') {
            if (welcomeSent) return // Si ya saludó, ignorar actualizaciones posteriores
            
            sock.isInit = true
            welcomeSent = true
            
            if (!global.conns.some(c => c.user?.id === sock.user?.id)) {
                global.conns.push(sock)
            }

            console.log(chalk.bold.green(`\n[OK] Agente +${sock.user.id.split(':')[0]} Conectado`))
            
            if (m && m.chat) {
                await conn.sendMessage(m.chat, { 
                    text: `✅ *@${m.sender.split('@')[0]}*, ya eres parte de la familia de Sub-Bots.`, 
                    mentions: [m.sender] 
                }, { quoted: m }).catch(() => {})
                
                await joinChannels(sock)
            }
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode || 500
            console.log(chalk.bold.yellow(`[SISTEMA] Conexión cerrada. Razón: ${reason}`))
            
            if (reason !== DisconnectReason.loggedOut) {
                creloadHandler(true).catch(console.error)
            } else {
                console.log(chalk.bold.red(`[SISTEMA] Sesión terminada por el usuario.`))
                sock.ev.removeAllListeners()
                setTimeout(() => {
                    if (fs.existsSync(pathEllenJadiBot)) fs.rmSync(pathEllenJadiBot, { recursive: true, force: true })
                }, 3000)
            }
            global.conns = global.conns.filter(c => c.ws?.socket?.readyState !== ws.CLOSED)
        }
    }

    let handler = await import('../handler.js')
    let creloadHandler = async function (restatConn) {
        try {
            const Handler = await import(`../handler.js?update=${Date.now()}`)
            if (Object.keys(Handler || {}).length) handler = Handler
        } catch (e) { console.error(e) }

        if (restatConn) {
            try { sock.ws.close() } catch {}
            sock = makeWASocket(connectionOptions)
        }

        sock.handler = handler.handler.bind(sock)
        sock.connectionUpdate = connectionUpdate.bind(sock)
        sock.credsUpdate = saveCreds.bind(sock, true)

        sock.ev.on("messages.upsert", sock.handler)
        sock.ev.on("connection.update", sock.connectionUpdate)
        sock.ev.on("creds.update", sock.credsUpdate)
        
        return true
    }

    creloadHandler(false)
}

const msToTime = (duration) => {
    let seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60)
    return `${minutes}m y ${seconds}s`
}

async function joinChannels(conn) {
    if (!global.ch) return
    for (const channelId of Object.values(global.ch)) {
        await conn.newsletterFollow(channelId).catch(() => {})
    }
}
