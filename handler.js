import { smsg } from './lib/simple.js'
import { format } from 'util'
import { performance } from 'perf_hooks'
import * as ws from 'ws'
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'
import fetch from 'node-fetch'
import failureHandler from './lib/respuesta.js'

const { WAProto: proto, WAMessageStubType, areJidsSameUser } = (await import('baileys'))

const isNumber = x => typeof x === 'number' && !isNaN(x)
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms))

// Normaliza el JID eliminando el número de sesión de la conexión (los :xx)
const cleanJid = jid => jid ? jid.replace(/:\d+@/, '@') : ''
const bareJid = jid => cleanJid(jid).split('@')[0]
const sameUser = (a, b) => {
    const cleanA = cleanJid(a)
    const cleanB = cleanJid(b)
    if (!cleanA || !cleanB) return false
    if (cleanA === cleanB) return true
    try { if (areJidsSameUser?.(cleanA, cleanB)) return true } catch {}
    return bareJid(cleanA) === bareJid(cleanB)
}
const participantMatches = (participant = {}, jid = '') => [participant.id, participant.jid, participant.lid]
    .filter(Boolean)
    .some(value => sameUser(value, jid))
const isParticipantAdmin = (participant = {}) => participant?.admin === 'admin' || participant?.admin === 'superadmin'

const GROUP_METADATA_TTL = 12 * 60 * 60 * 1000
const groupCache = new Map()
const backgroundTasks = new WeakMap()
const IGNORED_STUB_TYPES = new Set([
    WAMessageStubType.CIPHERTEXT,
    WAMessageStubType.E2E_DEVICE_CHANGED,
    WAMessageStubType.E2E_IDENTITY_CHANGED,
    WAMessageStubType.E2E_ENCRYPTED,
    WAMessageStubType.E2E_ENCRYPTED_NOW,
    WAMessageStubType.BIZ_PRIVACY_MODE_TO_BSP,
    WAMessageStubType.BIZ_PRIVACY_MODE_TO_FB
].filter(type => typeof type === 'number'))

let pluginRegistryCache = { version: -1, registry: null }

const matchPrefixFast = (text = '', prefix) => {
    if (!text) return null
    if (prefix instanceof RegExp) {
        prefix.lastIndex = 0
        return prefix.exec(text)?.[0] || null
    }
    if (Array.isArray(prefix)) {
        for (const item of prefix) {
            const matched = matchPrefixFast(text, item)
            if (matched) return matched
        }
        return null
    }
    if (typeof prefix === 'string') return text.startsWith(prefix) ? prefix : null
    return null
}

const getPluginRegistry = () => {
    const version = global.pluginsVersion || 0
    if (pluginRegistryCache.registry && pluginRegistryCache.version === version) return pluginRegistryCache.registry
    const registry = { byCommand: new Map(), regexCommand: [], customPrefix: [] }
    for (const [name, plugin] of Object.entries(global.plugins || {})) {
        if (!plugin || plugin.disabled) continue
        if (plugin.customPrefix) registry.customPrefix.push(name)
        const commands = Array.isArray(plugin.command) ? plugin.command : plugin.command ? [plugin.command] : []
        for (const command of commands) {
            if (typeof command === 'string') {
                const key = command.toLowerCase()
                const bucket = registry.byCommand.get(key) || new Set()
                bucket.add(name)
                registry.byCommand.set(key, bucket)
            } else if (command instanceof RegExp) {
                registry.regexCommand.push(name)
            }
        }
    }
    pluginRegistryCache = { version, registry }
    return registry
}

const getCommandCandidates = (text = '', prefix, registry) => {
    const usedPrefix = matchPrefixFast(text, prefix)
    const customMatches = registry.customPrefix.filter(name => matchPrefixFast(text, global.plugins?.[name]?.customPrefix))
    if (!usedPrefix && customMatches.length === 0) return null
    const effectivePrefix = usedPrefix || matchPrefixFast(text, global.plugins?.[customMatches[0]]?.customPrefix)
    const command = effectivePrefix ? (text.slice(effectivePrefix.length).trim().split(/\s+/)[0] || '').toLowerCase() : ''
    const names = new Set(customMatches)
    if (command) {
        for (const name of registry.byCommand.get(command) || []) names.add(name)
        for (const name of registry.regexCommand) names.add(name)
    }
    return names
}

const runDetached = (conn, task, label = 'background-task') => {
    const tasks = backgroundTasks.get(conn) || new Set()
    backgroundTasks.set(conn, tasks)
    const promise = new Promise(resolve => setImmediate(resolve))
        .then(task)
        .catch(error => console.error(`Error en ${label}:`, error))
        .finally(() => tasks.delete(promise))
    tasks.add(promise)
    return promise
}

const normalizeTimestamp = timestamp => {
    const value = Number(timestamp || 0)
    if (!Number.isFinite(value) || value <= 0) return Math.floor(Date.now() / 1000)
    return value > 1e12 ? Math.floor(value / 1000) : value > 1e10 ? Math.floor(value / 1000) : Math.floor(value)
}

const buildParticipantIndexes = (participants = []) => {
    const byJid = new Map()
    const byLid = new Map()
    for (const p of participants) {
        const jid = cleanJid(p?.jid || p?.id)
        const lid = cleanJid(p?.lid)
        if (jid) byJid.set(jid, p)
        if (lid) byLid.set(lid, p)
    }
    return { byJid, byLid }
}

const resolveRuntimeJid = (jid, indexes = {}) => {
    const normalized = cleanJid(jid)
    if (!normalized) return normalized
    if (!normalized.endsWith('@lid')) return normalized
    return indexes.byLid?.get(normalized)?.jid || normalized
}

function resolveMessageMentions(m, participants_lid) {
    try {
        const rawMentions = m.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
                            m.message?.contactsArrayMessage?.contacts || [];

        const normalized = rawMentions.map(mention => {
            if (mention.endsWith('@lid')) {
                const found = participants_lid.find(p => p.lid === mention);
                return found ? found.jid : mention.replace('@lid', '@s.whatsapp.net');
            }
            return mention;
        });

        m.mentions = normalized;

    } catch (error) {
        console.error("Error al normalizar menciones:", error);
        m.mentions = [];
    }
}

const defaultUser = { exp: 0, coin: 10, joincount: 1, diamond: 3, lastadventure: 0, lastclaim: 0, health: 100, crime: 0, lastcofre: 0, lastdiamantes: 0, lastpago: 0, lastcode: 0, lastcodereg: 0, lastduel: 0, lastmining: 0, muto: false, premium: false, premiumTime: 0, registered: false, genre: '', birth: '', marry: '', description: '', packstickers: null, age: -1, regTime: -1, afk: -1, afkReason: '', role: 'Nuv', banned: false, useDocument: false, level: 0, bank: 0, warn: 0, spam: 0 }
const defaultChat = { isBanned: false, sAutoresponder: '', welcome: true, autolevelup: false, autoAceptar: false, autosticker: false, autoRechazar: false, autoresponder: false, detect: true, antiBot: false, antiBot2: false, modoadmin: false, antiLink: true, antiImg: false, reaction: false, nsfw: false, antifake: false, delete: false, expired: 0, antiLag: false, per: [], users: {} }
const defaultSettings = { self: false, restrict: true, jadibotmd: true, antiPrivate: false, autoread: false, status: 0 }

global.dfail = (type, m, conn) => {
    failureHandler(type, conn, m, global.comando)
}

export function handler(chatUpdate) {
    return runDetached(this, () => processChatUpdate.call(this, chatUpdate), 'handler')
}

async function processChatUpdate(chatUpdate) {
    const receivedAt = performance.now()
    let sender = '';
    this.msgqueque = this.msgqueque || []
    this.uptime = this.uptime || Date.now()
    this.connectionStartedAt = this.connectionStartedAt || this.uptime

    if (!chatUpdate) return
    this.pushMessage(chatUpdate.messages).catch(console.error)

    let m = chatUpdate.messages[chatUpdate.messages.length - 1]
    if (!m) return

    const msgTimestamp = normalizeTimestamp(m.messageTimestamp)
    const connectionStartedAt = normalizeTimestamp(this.connectionStartedAt)
    if (msgTimestamp < connectionStartedAt) return

    if (m.messageStubType && IGNORED_STUB_TYPES.has(m.messageStubType)) return
    if (m.key.id.startsWith('BAE5') || m.key.id.startsWith('3EB0') || m.id?.startsWith('NJX-') || m.isBaileys) return

    if (global.db.data == null) await global.loadDatabase()

    try {
        m = smsg(this, m) || m
        if (!m) return
        // 👇 INTERCEPTOR DE BOTONES EN EL NÚCLEO 👇
        const btnMsg = m.message?.buttonsResponseMessage ||
                     m.message?.templateButtonReplyMessage ||
                     m.message?.listResponseMessage ||
                     m.message?.interactiveResponseMessage;

        if (btnMsg) {
            let command = btnMsg.selectedButtonId || btnMsg.singleSelectReply?.selectedRowId;

            if (!command && btnMsg.nativeFlowResponseMessage) {
                try {
                    const params = JSON.parse(btnMsg.nativeFlowResponseMessage.paramsJson || '{}');
                    command = params.id || m.text;
                } catch (e) {}
            }

            if (command) {
                m.text = command;
                m.message = { conversation: command };
                m.isButton = true;
            }
        }
        // 👆 FIN DEL INTERCEPTOR 👆

        let sender = m.isGroup ? (m.key.participant ? m.key.participant : m.sender) : m.key.remoteJid

        let groupMetadata = {}
        let participants = []
        let participants_lid = []

        if (m.isGroup) {
            const now = Date.now()
            const cachedGroup = groupCache.get(m.chat)

            if (cachedGroup && (now - cachedGroup.timestamp < 10 * 60 * 1000)) {
                groupMetadata = cachedGroup.data
            } else {
                try {
                    const meta = await (this.getSmartGroupMetadata ? this.getSmartGroupMetadata(m.chat, { maxAge: GROUP_METADATA_TTL }) : this.groupMetadata(m.chat))
                    groupMetadata = { ...meta }
                    if (meta?.participants) {
                        groupMetadata.participants = meta.participants.map(p => ({ ...p, id: p.jid || p.id, jid: p.jid || p.id, lid: p.lid }))
                    }
                    groupCache.set(m.chat, { data: groupMetadata, indexes: buildParticipantIndexes(groupMetadata.participants || []), timestamp: now })
                } catch (e) {
                    groupMetadata = {}
                }
            }

            const isLikelyCommand = Boolean(matchPrefixFast(m.text || '', this.prefix || global.prefix))
            if (isLikelyCommand) {
                try {
                    const freshMeta = await this.groupMetadata(m.chat)
                    if (freshMeta?.participants?.length) {
                        groupMetadata = {
                            ...freshMeta,
                            participants: freshMeta.participants.map(p => ({ ...p, id: p.jid || p.id, jid: p.jid || p.id, lid: p.lid }))
                        }
                        groupCache.set(m.chat, { data: groupMetadata, indexes: buildParticipantIndexes(groupMetadata.participants || []), timestamp: Date.now() })
                    }
                } catch (error) {
                    console.error(`No se pudo refrescar metadata admin para ${m.chat}:`, error)
                }
            }

            participants = groupMetadata.participants || []
            const participantIndexes = groupCache.get(m.chat)?.indexes || cachedGroup?.indexes || buildParticipantIndexes(participants)
            participants_lid = participants.map(p => ({ id: p.jid, jid: p.jid, lid: p.lid, admin: p.admin }))
            sender = resolveRuntimeJid(sender, participantIndexes)

            Object.defineProperty(m, 'sender', {
                value: sender,
                writable: true,
                configurable: true,
                enumerable: true
            })

            if (m.key?.participant?.endsWith?.('@lid')) {
                Object.defineProperty(m.key, 'participant', {
                    value: sender,
                    writable: true,
                    configurable: true,
                    enumerable: true
                })
            }

            resolveMessageMentions(m, participants_lid)

            const chatDb = global.db.data.chats[m.chat] || {}

            const currentBotJid = cleanJid(this.user?.id || this.user?.jid)

            if (chatDb.primaryBot && currentBotJid !== chatDb.primaryBot) {
                const universalWords = ['resetbot', 'resetprimario', 'botreset']
                const firstWord = m.text ? m.text.trim().split(' ')[0].toLowerCase().replace(/^[./#]/, '') : ''
                const primaryPresent = (groupCache.get(m.chat)?.indexes?.byJid?.has(cleanJid(chatDb.primaryBot))) || false
                if (!primaryPresent && Array.isArray(chatDb.per) && chatDb.per.length) {
                    const activeBots = [global.conn, ...(global.conns || [])]
                        .filter(bot => bot?.user && bot?.ws?.socket?.readyState !== ws.CLOSED && chatDb.per.includes(bot.user.id || bot.user.jid))
                    const selected = activeBots.length ? activeBots[Math.floor(Math.random() * activeBots.length)]?.user : null
                    const selectedJid = cleanJid(selected?.id || selected?.jid)
                    if (selectedJid && currentBotJid !== selectedJid && !universalWords.includes(firstWord)) return
                } else if (!universalWords.includes(firstWord)) return
            }
        }

        m.exp = 0
        m.coin = false

        let user = global.db.data.users[sender]
        if (!user) {
            global.db.data.users[sender] = { ...defaultUser, name: m.name || '' }
            user = global.db.data.users[sender]
        } else {
            for (let key in defaultUser) {
                if (user[key] === undefined) { user[key] = defaultUser[key] }
            }
            if (!user.name && m.name) { user.name = m.name }
        }

        let chat = global.db.data.chats[m.chat]
        if (!chat) {
            global.db.data.chats[m.chat] = { ...defaultChat }
            chat = global.db.data.chats[m.chat]
        } else {
            for (let key in defaultChat) {
                if (chat[key] === undefined) { chat[key] = defaultChat[key] }
            }
        }

        let currentBotId = cleanJid(this.user?.id || this.user?.jid)
        let settings = global.db.data.settings[currentBotId]
        if (!settings) {
            global.db.data.settings[currentBotId] = { ...defaultSettings }
            settings = global.db.data.settings[currentBotId]
        } else {
            for (let key in defaultSettings) {
                if (settings[key] === undefined) { settings[key] = defaultSettings[key] }
            }
        }

        const mainBot = cleanJid(global.conn.user?.id || global.conn.user?.jid)
        const isSubbs = chat?.antiLag === true
        const allowedBots = chat?.per || []
        if (!allowedBots.includes(mainBot)) allowedBots.push(mainBot)
        const isAllowed = allowedBots.includes(currentBotId)
        if (isSubbs && !isAllowed) return

        if (opts['nyimak']) return
        if (!m.fromMe && opts['self']) return
        if (opts['swonly'] && m.chat !== 'status@broadcast') return
        if (typeof m.text !== 'string') m.text = ''

        const senderJid = cleanJid(sender);
        const botJid = cleanJid(this.user?.id || this.user?.jid || '');

        let userObj = {};
        let botObj = {};

        if (m.isGroup && participants.length > 0) {
            userObj = participants.find(p => participantMatches(p, senderJid)) || {};
            botObj = participants.find(p => participantMatches(p, botJid) || participantMatches(p, this.user?.jid) || participantMatches(p, this.user?.id)) || {};
        }

        const isRAdmin = userObj?.admin === 'superadmin' || false;
        const isAdmin = isRAdmin || isParticipantAdmin(userObj) || false;
        const isBotAdmin = isParticipantAdmin(botObj) || false;

        const senderNum = sender.split('@')[0]
        const isROwner = [mainBot, ...global.owner.map(([n]) => n)].map(v => v.replace(/[^0-9]/g, '')).includes(senderNum)
        const isOwner = isROwner || m.fromMe
        const isMods = isOwner || global.mods.map(v => v.replace(/[^0-9]/g, '')).includes(senderNum)
        const isPrems = isROwner || global.prems.map(v => v.replace(/[^0-9]/g, '')).includes(senderNum) || user.premium === true

        if (opts['queque'] && m.text && !(isMods || isPrems)) {
            const queueId = m.id || m.key.id
            const time = 5000
            const previousTask = this.messageQueue || Promise.resolve()
            this.msgqueque.push(queueId)
            this.messageQueue = previousTask
                .catch(() => {})
                .then(() => delay(time))
            await previousTask.catch(() => {})
        }

        m.exp += Math.ceil(Math.random() * 10)
        let usedPrefix

        const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins')
        const pluginRegistry = getPluginRegistry()
        const commandCandidates = getCommandCandidates(m.text, conn.prefix || global.prefix, pluginRegistry)

        for (let name in global.plugins) {
            let plugin = global.plugins[name]
            if (!plugin || plugin.disabled) continue
            const __filename = join(___dirname, name)

            if (typeof plugin.all === 'function') {
                try {
                    await plugin.all.call(this, m, { chatUpdate, __dirname: ___dirname, __filename, conn: this })
                } catch (e) {
                    console.error(e)
                }
            }

            if (typeof plugin.before === 'function') {
                try {
                    if (await plugin.before.call(this, m, { match: null, conn: this, participants, groupMetadata, user: userObj, bot: botObj, isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems, chatUpdate, __dirname: ___dirname, __filename })) continue
                } catch (e) {
                    console.error(`Error en plugin.before (${name}):`, e)
                }
            }

            if (!commandCandidates || !commandCandidates.has(name)) continue

            if (!opts['restrict'] && plugin.tags && plugin.tags.includes('admin')) continue

            const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
            let _prefix = plugin.customPrefix ? plugin.customPrefix : conn.prefix ? conn.prefix : global.prefix
            let match = (_prefix instanceof RegExp ? [[_prefix.exec(m.text), _prefix]] : Array.isArray(_prefix) ? _prefix.map(p => { let re = p instanceof RegExp ? p : new RegExp(str2Regex(p)); return [re.exec(m.text), re] }) : typeof _prefix === 'string' ? [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]] : [[[], new RegExp]]).find(p => p[0])

            if (!match) continue

            if (typeof plugin !== 'function') continue

            if ((usedPrefix = (match[0] || '')[0])) {
                let noPrefix = m.text.replace(usedPrefix, '')
                let [command, ...args] = noPrefix.trim().split` `.filter(v => v)
                args = args || []
                let _args = noPrefix.trim().split` `.slice(1)
                let text = _args.join` `
                command = (command || '').toLowerCase()
                let fail = plugin.fail || global.dfail
                let isAccept = plugin.command instanceof RegExp ? plugin.command.test(command) : Array.isArray(plugin.command) ? plugin.command.some(cmd => cmd instanceof RegExp ? cmd.test(command) : cmd === command) : typeof plugin.command === 'string' ? plugin.command === command : false

                global.comando = command

                if (!isAccept) continue
                m.plugin = name

                if (m.chat in global.db.data.chats || sender in global.db.data.users) {
                    let chatData = global.db.data.chats[m.chat]
                    let userData = global.db.data.users[sender]

                    if (!['grupo-unbanchat.js', 'owner-exec.js', 'owner-exec2.js', 'grupo-delete.js'].includes(name) && chatData?.isBanned && !isROwner) return

                    if (userData.banned && name !== 'owner-unbanuser.js' && !isROwner) {
                        if (userData.antispam > 2) return
                        m.reply(`《✦》Estas baneado/a, no puedes usar comandos en este bot!\n\n${userData.bannedReason ? `✰ *Motivo:* ${userData.bannedReason}` : '✰ *Motivo:* Sin Especificar'}`)
                        userData.antispam = (userData.antispam || 0) + 1
                        return
                    }

                    if (new Date() - userData.spam < 1500 && !isROwner) return
                    userData.spam = new Date() * 1
                }

                let adminMode = global.db.data.chats[m.chat]?.modoadmin
                let mini = `${plugin.botAdmin || plugin.admin || plugin.group || plugin.command}`
                if (adminMode && !isOwner && !isROwner && m.isGroup && !isAdmin && mini) return

                if (plugin.rowner && plugin.owner && !(isROwner || isOwner)) { fail('owner', m, this); continue }
                if (plugin.rowner && !isROwner) { fail('rowner', m, this); continue }
                if (plugin.owner && !isOwner) { fail('owner', m, this); continue }
                if (plugin.mods && !isMods) { fail('mods', m, this); continue }
                if (plugin.premium && !isPrems) { fail('premium', m, this); continue }
                if (plugin.admin && !isAdmin) { fail('admin', m, this); continue }
                if (plugin.botAdmin && !isBotAdmin) { fail('botAdmin', m, this); continue }
                if (plugin.private && m.isGroup) { fail('private', m, this); continue }
                if (plugin.group && !m.isGroup) { fail('group', m, this); continue }
                if (plugin.register == true && user.registered == false) { fail('unreg', m, this); continue }

                m.isCommand = true
                let xp = 'exp' in plugin ? parseInt(plugin.exp) : 17
                if (xp > 200) m.reply('chirrido -_-')
                else m.exp += xp

                if (!isPrems && plugin.coin && global.db.data.users[sender].coin < plugin.coin * 1) {
                    conn.reply(m.chat, `❮✦❯ Se agotaron tus monedas`, m)
                    continue
                }

                if (plugin.level > user.level) {
                    conn.reply(m.chat, `❮✦❯ Se requiere el nivel: *${plugin.level}*\n\n• Tu nivel actual es: *${user.level}*\n\n• Usa este comando para subir de nivel:\n*${usedPrefix}levelup*`, m)
                    continue
                }

                let extra = { match, usedPrefix, noPrefix, _args, args, command, text, conn: this, participants, groupMetadata, user: userObj, bot: botObj, isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems, chatUpdate, __dirname: ___dirname, __filename }

                try {
                    await plugin.call(this, m, extra)
                    if (!isPrems) m.coin = m.coin || plugin.coin || false
                } catch (e) {
                    m.error = e
                    console.error(e)
                    if (e) {
                        let textErr = format(e)
                        for (let key of Object.values(global.APIKeys || {})) {
                            textErr = textErr.replace(new RegExp(key, 'g'), 'Administrador')
                        }
                        m.reply(textErr)
                    }
                } finally {
                    if (typeof plugin.after === 'function') {
                        try {
                            await plugin.after.call(this, m, extra)
                        } catch (e) {
                            console.error(e)
                        }
                    }
                    if (m.coin) conn.reply(m.chat, `❮✦❯ Utilizaste ${+m.coin} monedas`, m)
                    const elapsed = performance.now() - receivedAt
                    if (elapsed > 50) console.log(`[⚡ ${Math.round(elapsed)}ms] Comando: ${usedPrefix || ''}${command} | Usuario: ${sender}`)
                }
                break
            }
        }
    } catch (e) {
        console.error(e)
    } finally {
        if (opts['queque'] && m.text) {
            const quequeIndex = this.msgqueque.indexOf(m.id || m.key.id)
            if (quequeIndex !== -1) this.msgqueque.splice(quequeIndex, 1)
        }

        let userStats, stats = global.db.data.stats
        if (m) {
            const chatObj = global.db.data.chats[m.chat] ?? {};

            if (chatObj.users?.[sender]?.mute2) {
                let botObjFinal = {}
                if (m.isGroup) {
                    const finalBotJid = cleanJid(this.user?.id || this.user?.jid || '');
                    botObjFinal = participants.find(p => cleanJid(p.id || p.jid) === finalBotJid) || {};
                }

                if (botObjFinal?.admin === 'admin' || botObjFinal?.admin === 'superadmin') {
                    await this.sendMessage(m.chat, { delete: m.key }).catch(() => {})
                }
                return
            }

            if (sender && (userStats = global.db.data.users[sender])) {
                userStats.exp += m.exp
                userStats.coin -= (m.coin ? m.coin * 1 : 0)
            }

            let stat
            if (m.plugin) {
                let now = +new Date
                if (m.plugin in stats) {
                    stat = stats[m.plugin]
                    if (!isNumber(stat.total)) stat.total = 1
                    if (!isNumber(stat.success)) stat.success = m.error != null ? 0 : 1
                    if (!isNumber(stat.last)) stat.last = now
                    if (!isNumber(stat.lastSuccess)) stat.lastSuccess = m.error != null ? 0 : now
                } else {
                    stat = stats[m.plugin] = { total: 1, success: m.error != null ? 0 : 1, last: now, lastSuccess: m.error != null ? 0 : now }
                }
                stat.total += 1
                stat.last = now
                if (m.error == null) {
                    stat.success += 1
                    stat.lastSuccess = now
                }
            }
        }

        try {
            if (!opts['noprint']) await (await import(`./lib/print.js`)).default(m, this)
        } catch (e) {
            console.log(m, m.quoted, e)
        }

        if (opts['autoread']) await this.readMessages([m.key])

        if (global.db.data.chats[m.chat]?.reaction && m.text.length > 0) {
            const reactionRegex = /(ción|dad|aje|oso|izar|mente|pero|tion|age|ous|ate|and|but|ify|ai|yuki|a|s)/i
            if (reactionRegex.test(m.text)) {
                const emotList = ["🍟", "😃", "😄", "😁", "😆", "🍓", "😅", "😂", "🤣", "🥲", "☺️", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "🌺", "🌸", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🌟", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "💫", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😶‍🌫️", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🫣", "🤭", "🤖", "🍭", "🤫", "🫠", "🤥", "😶", "📇", "😐", "💧", "😑", "🫨", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😮‍💨", "😵", "😵‍💫", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👺", "🧿", "🌩", "👻", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "🫶", "👍", "✌️", "🙏", "🫵", "🤏", "🤌", "☝️", "🖕", "🫂", "🐱", "🤹‍♀️", "🤹‍♂️", "🗿", "✨", "⚡", "🔥", "🌈", "🩷", "❤️", "🧡", "💛", "💚", "🩵", "💙", "💜", "🖤", "🩶", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "🚩", "👊", "⚡️", "💋", "🫰", "💅", "👑", "🐣", "🐤", "🐈"]
                const emot = emotList[Math.floor(Math.random() * emotList.length)]
                if (!m.fromMe) {
                    this.sendMessage(m.chat, { react: { text: emot, key: m.key } })
                }
            }
        }
    }
}

const file = global.__filename(import.meta.url, true)

watchFile(file, async () => {
    unwatchFile(file)
    console.log(chalk.green('Actualizando "handler.js"'))
    if (global.conns && global.conns.length > 0 ) {
        const users = [...new Set([...global.conns.filter((conn) => conn.user && conn.ws.socket && conn.ws.socket.readyState !== ws.CLOSED).map((conn) => conn)])]
        for (const userr of users) {
            userr.subreloadHandler(false)
        }
    }
})

export default { handler }
