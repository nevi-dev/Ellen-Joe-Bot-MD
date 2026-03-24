/* 🦈 𝗘𝗟𝗟𝗘𝗡 𝗝𝗢𝗘 - 𝗦𝗘𝗥𝗕𝗢𝗧 𝗢𝗣𝗧𝗜𝗠𝗜𝗭𝗔𝗗𝗢 
   - Estabilidad: Full (subreloadHandler fix)
   - Privacidad: Total (No IP/Rutas leaks)
   - Consumo: Mínimo (No Sync History)
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
const EllenJBOptions = {}

if (!(global.conns instanceof Array)) global.conns = []

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let time = global.db.data.users[m.sender].Subs + 120000
    if (new Date - global.db.data.users[m.sender].Subs < 120000) return conn.reply(m.chat, `🦈 Aguarda ${msToTime(time - new Date())} para vincular otro Agente.`, m)
    
    const subBots = global.conns.filter((conn) => conn.user && conn.ws.socket && conn.ws.socket.readyState !== ws.CLOSED)
    if (subBots.length >= 90) return m.reply(`❌ Capacidad de Agentes llena.`)

    let id = `${m.sender.split`@`[0]}`
    let pathEllenJadiBot = path.join(`./${jadi}/`, id)
    
    if (!fs.existsSync(pathEllenJadiBot)) fs.mkdirSync(pathEllenJadiBot, { recursive: true })

    console.log(chalk.bold.blue(`[SISTEMA] Generando sesión para: ${id}`))

    EllenJBOptions.pathEllenJadiBot = pathEllenJadiBot
    EllenJBOptions.m = m
    EllenJBOptions.conn = conn
    EllenJBOptions.args = args
    EllenJBOptions.usedPrefix = usedPrefix
    EllenJBOptions.command = command
    EllenJBOptions.fromCommand = true
    
    EllenJadiBot(EllenJBOptions)
    global.db.data.users[m.sender].Subs = new Date * 1
}

handler.help = ['qr', 'code']
handler.tags = ['serbot']
handler.command = ['qr', 'code']
export default handler

export async function EllenJadiBot(options) {
    let { pathEllenJadiBot, m, conn, args, usedPrefix, command } = options
    if (command === 'code') { command = 'qr'; args.unshift('code') }
    
    const mcode = /(--code|code)/.test(args[0]) || /(--code|code)/.test(args[1])
    const pathCreds = path.join(pathEllenJadiBot, "creds.json")

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
        // PRIVACIDAD: Oculta que es un servidor en San Pedro
        browser: ['Chrome', 'MacOS', '110.0.5585.95'], 
        version,
        syncFullHistory: false, // RAM: No descarga chats viejos (vital para VPS)
        markOnlineOnConnect: false,
        connectTimeoutMs: 60000,
        generateHighQualityLinkPreview: true
    }

    let sock = makeWASocket(connectionOptions)
    sock.isInit = false
    let isInit = true

    async function connectionUpdate(update) {
        const { connection, lastDisconnect, qr } = update
        
        if (qr && !mcode) {
            if (m?.chat) {
                let txtQR = await conn.sendMessage(m.chat, { image: await qrcode.toBuffer(qr, { scale: 8 }), caption: "*🦈 PROTOCOLO DE AGENTE ELLEN*\n\n> Escanea para activar tu Sub-Bot." }, { quoted: m })
                setTimeout(() => { conn.sendMessage(m.sender, { delete: txtQR.key }).catch(() => {}) }, 30000)
            }
            return
        }

        if (qr && mcode) {
            let secret = await sock.requestPairingCode(m.sender.split`@`[0])
            secret = secret.match(/.{1,4}/g)?.join("-")
            console.log(chalk.bold.yellow(`[CODE] Código generado para ${m.sender}: ${secret}`))
            let txtCode = await m.reply(secret)
            setTimeout(() => { conn.sendMessage(m.sender, { delete: txtCode.key }).catch(() => {}) }, 35000)
        }

        if (connection === 'open') {
            sock.isInit = true
            global.conns.push(sock)
            console.log(chalk.bold.cyanBright(`\n[OK] Agente Conectado: ${sock.user.name || 'Bot'}`))
            
            // FIX: Validar que m y m.chat existan antes de enviar el mensaje
            if (m && m.chat) {
                await conn.sendMessage(m.chat, { 
                    text: `✅ Ya eres parte de la familia de Sub-Bots.`, 
                    mentions: [m.sender] 
                }, { quoted: m }).catch(err => console.error("Error enviando confirmación:", err))
            }
            
            await joinChannels(sock)
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode || 500
            global.conns = global.conns.filter(conn => conn.ws.socket && conn.ws.socket.readyState !== ws.CLOSED)
            console.log(chalk.bold.red(`[SISTEMA] Conexión cerrada. Razón: ${reason}`))
            
            if (reason !== DisconnectReason.loggedOut) {
                // RECARGA AUTOMÁTICA SI NO FUE DESCONEXIÓN MANUAL
                creloadHandler(true).catch(console.error)
            } else {
                console.log(chalk.bold.red(`[SISTEMA] Sesión eliminada definitivamente.`))
                fs.rmdirSync(pathEllenJadiBot, { recursive: true })
            }
        }
    }

    // --- SISTEMA DE RECARGA DE HANDLER (FIX PARA PLUGIN UPDATES) ---
    let handler = await import('../handler.js')
    let creloadHandler = async function (restatConn) {
        try {
            // Importar el handler con un timestamp para forzar la recarga en memoria
            const Handler = await import(`../handler.js?update=${Date.now()}`)
            if (Object.keys(Handler || {}).length) handler = Handler
            console.log(chalk.bold.green(`[RELOAD] Lógica actualizada para Sub-Bot.`))
        } catch (e) {
            console.error('[ERROR RELOAD]: ', e)
        }

        if (restatConn) {
            try { sock.ws.close() } catch {}
            sock.ev.removeAllListeners()
            sock = makeWASocket(connectionOptions)
            isInit = true
        }

        if (!isInit) {
            sock.ev.off("messages.upsert", sock.handler)
            sock.ev.off("connection.update", sock.connectionUpdate)
            sock.ev.off('creds.update', sock.credsUpdate)
        }

        // UNIÓN DE FUNCIONES AL SOCKET
        sock.handler = handler.handler.bind(sock)
        sock.subreloadHandler = (re) => creloadHandler(re) // IMPORTANTE PARA EVITAR TYPEERROR
        sock.connectionUpdate = connectionUpdate.bind(sock)
        sock.credsUpdate = saveCreds.bind(sock, true)

        sock.ev.on("messages.upsert", sock.handler)
        sock.ev.on("connection.update", sock.connectionUpdate)
        sock.ev.on("creds.update", sock.credsUpdate)
        
        isInit = false
        return true
    }

    creloadHandler(false)
}

// --- UTILIDADES ---
const msToTime = (duration) => {
    let seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60)
    return `${minutes}m y ${seconds}s`
}

async function joinChannels(conn) {
    for (const channelId of Object.values(global.ch || {})) {
        await conn.newsletterFollow(channelId).catch(() => {})
    }
}
