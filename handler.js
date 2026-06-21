import { smsg } from './lib/simple.js'
import { format } from 'util'
import * as ws from 'ws'
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'
import fetch from 'node-fetch'
import failureHandler from './lib/respuesta.js'

const { proto } = (await import('@whiskeysockets/baileys')).default

const isNumber = x => typeof x === 'number' && !isNaN(x)
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms))
const cleanJid = jid => jid?.split(':')[0] || ''

const groupCache = new Map()

function createMutableMessage(message) {
    if (!message || typeof message !== 'object') return message
    const clone = Object.create(Object.getPrototypeOf(message))
    Object.defineProperties(clone, Object.getOwnPropertyDescriptors(message))
    return clone
}

function setMessageContext(message, context) {
    for (const [key, value] of Object.entries(context)) {
        Object.defineProperty(message, key, { value, writable: true, configurable: true, enumerable: true })
    }
}

global.dfail = (type, m, conn) => {
    failureHandler(type, conn, m, global.comando)
}

export async function handler(chatUpdate) {
    let sender;
    this.msgqueque = this.msgqueque || []
    this.uptime = this.uptime || Date.now()
    
    if (!chatUpdate) return

    this.pushMessage(chatUpdate.messages).catch(console.error)
    let m = chatUpdate.messages[chatUpdate.messages.length - 1]
    if (!m) return

    if (m.key.id.startsWith('BAE5') || m.key.id.startsWith('3EB0') || m.id?.startsWith('NJX-') || m.isBaileys) return

    if (global.db.data == null) await global.loadDatabase()

    try {
        m = createMutableMessage(smsg(this, m) || m)
        if (!m) return

        let sender = m.isGroup ? (m.key.participant ? m.key.participant : m.sender) : m.key.remoteJid

        let groupMetadata = {}
        let participants = []
        let participants_lid = []

        if (m.isGroup) {
            if (groupCache.has(m.chat)) {
                groupMetadata = groupCache.get(m.chat)
            } else {
                try {
                    const meta = await this.groupMetadata(m.chat)
                    groupMetadata = { ...meta }
                    if (meta?.participants) {
                        groupMetadata.participants = meta.participants.map(p => ({ ...p, id: p.jid, jid: p.jid, lid: p.lid }))
                    }
                    groupCache.set(m.chat, groupMetadata)
                    setTimeout(() => groupCache.delete(m.chat), 10 * 60 * 1000)
                } catch (e) {
                    groupMetadata = {}
                }
            }

            participants = groupMetadata.participants || []
            participants_lid = participants.map(participant => ({ id: participant.jid, jid: participant.jid, lid: participant.lid, admin: participant.admin }))
            
            if (sender.endsWith('@lid') || isNaN(sender.split('@')[0])) {
                const participantInfo = participants_lid.find(p => p.id === sender || p.lid === sender)
                if (participantInfo?.jid) sender = participantInfo.jid
            }

            const chatDb = global.db.data.chats[m.chat] || {}
            if (chatDb.primaryBot && this.user.jid !== chatDb.primaryBot) {
                const universalWords = ['resetbot', 'resetprimario', 'botreset']
                const firstWord = m.text ? m.text.trim().split(' ')[0].toLowerCase().replace(/^[./#]/, '') : ''
                if (!universalWords.includes(firstWord)) return
            }
        }

        let mentionedJid = m.mentionedJid || []
        let isSelfTarget = mentionedJid.length === 0 && !m.quoted
        let userId = isSelfTarget ? sender : (mentionedJid.length > 0 ? mentionedJid[0] : m.quoted.sender)

        if (m.isGroup && userId && (userId.endsWith('@lid') || isNaN(userId.split('@')[0]))) {
            try {
                const found = (participants || []).find(p => p.id === userId || p.jid === userId || p.lid === userId)
                if (found?.jid) userId = found.jid
            } catch {}
        }

        const getName = async (jid) => {
            try {
                const n = await this.getName(jid)
                return typeof n === 'string' && n.trim() ? n : jid.split('@')[0]
            } catch { return jid.split('@')[0] }
        }

        let from = m.pushName || await getName(sender)
        let who = await getName(userId)
        setMessageContext(m, { sender, from, who, targetJid: userId, exp: 0, coin: false })

        let user = global.db.data.users[sender]
        if (typeof user !== 'object') global.db.data.users[sender] = {}
        if (user) {
            if (!isNumber(user.exp)) user.exp = 0
            if (!isNumber(user.coin)) user.coin = 10
            if (!isNumber(user.joincount)) user.joincount = 1
            if (!isNumber(user.diamond)) user.diamond = 3
            if (!isNumber(user.lastadventure)) user.lastadventure = 0
            if (!isNumber(user.lastclaim)) user.lastclaim = 0
            if (!isNumber(user.health)) user.health = 100
            if (!isNumber(user.crime)) user.crime = 0
            if (!isNumber(user.lastcofre)) user.lastcofre = 0
            if (!isNumber(user.lastdiamantes)) user.lastdiamantes = 0
            if (!isNumber(user.lastpago)) user.lastpago = 0
            if (!isNumber(user.lastcode)) user.lastcode = 0
            if (!isNumber(user.lastcodereg)) user.lastcodereg = 0
            if (!isNumber(user.lastduel)) user.lastduel = 0
            if (!isNumber(user.lastmining)) user.lastmining = 0
            if (!('muto' in user)) user.muto = false
            if (!('premium' in user)) user.premium = false
            if (!user.premium) user.premiumTime = 0
            if (!('registered' in user)) user.registered = false
            if (!('genre' in user)) user.genre = ''
            if (!('birth' in user)) user.birth = ''
            if (!('marry' in user)) user.marry = ''
            if (!('description' in user)) user.description = ''
            if (!('packstickers' in user)) user.packstickers = null
            if (!user.registered) {
                if (!('name' in user)) user.name = m.name
                if (!isNumber(user.age)) user.age = -1
                if (!isNumber(user.regTime)) user.regTime = -1
            }
            if (!isNumber(user.afk)) user.afk = -1
            if (!('afkReason' in user)) user.afkReason = ''
            if (!('role' in user)) user.role = 'Nuv'
            if (!('banned' in user)) user.banned = false
            if (!('useDocument' in user)) user.useDocument = false
            if (!isNumber(user.level)) user.level = 0
            if (!isNumber(user.bank)) user.bank = 0
            if (!isNumber(user.warn)) user.warn = 0
            if (!isNumber(user.spam)) user.spam = 0
        } else {
            global.db.data.users[sender] = {
                exp: 0, coin: 10, joincount: 1, diamond: 3, lastadventure: 0, health: 100, lastclaim: 0, lastcofre: 0, lastdiamantes: 0, lastcode: 0, lastduel: 0, lastpago: 0, lastmining: 0, lastcodereg: 0, muto: false, registered: false, genre: '', birth: '', marry: '', description: '', packstickers: null, name: m.name, age: -1, regTime: -1, afk: -1, afkReason: '', banned: false, useDocument: false, bank: 0, level: 0, role: 'Nuv', premium: false, premiumTime: 0, spam: 0
            }
        }

        let chat = global.db.data.chats[m.chat]
        if (typeof chat !== 'object') global.db.data.chats[m.chat] = {}
        if (chat) {
            if (!('isBanned' in chat)) chat.isBanned = false
            if (!('sAutoresponder' in chat)) chat.sAutoresponder = ''
            if (!('welcome' in chat)) chat.welcome = true
            if (!('autolevelup' in chat)) chat.autolevelup = false
            if (!('autoAceptar' in chat)) chat.autoAceptar = false
            if (!('autosticker' in chat)) chat.autosticker = false
            if (!('autoRechazar' in chat)) chat.autoRechazar = false
            if (!('autoresponder' in chat)) chat.autoresponder = false    
            if (!('detect' in chat)) chat.detect = true
            if (!('antiBot' in chat)) chat.antiBot = false
            if (!('antiBot2' in chat)) chat.antiBot2 = false
            if (!('modoadmin' in chat)) chat.modoadmin = false   
            if (!('antiLink' in chat)) chat.antiLink = true
            if (!('antiImg' in chat)) chat.antiImg = false
            if (!('reaction' in chat)) chat.reaction = false
            if (!('nsfw' in chat)) chat.nsfw = false
            if (!('antifake' in chat)) chat.antifake = false
            if (!('delete' in chat)) chat.delete = false
            if (!isNumber(chat.expired)) chat.expired = 0
            if (!('antiLag' in chat)) chat.antiLag = false
            if (!('per' in chat)) chat.per = []
            if (!('users' in chat)) chat.users = {}
        } else {
            global.db.data.chats[m.chat] = {
                sAutoresponder: '', welcome: true, isBanned: false, autolevelup: false, autoresponder: false, delete: false, autoAceptar: false, autoRechazar: false, detect: true, antiBot: false, antiBot2: false, modoadmin: false, antiLink: true, antifake: false, reaction: false, nsfw: false, expired: 0, antiLag: false, per: [], users: {}
            }
        }

        var settings = global.db.data.settings[this.user.jid]
        if (typeof settings !== 'object') global.db.data.settings[this.user.jid] = {}
        if (settings) {
            if (!('self' in settings)) settings.self = false
            if (!('restrict' in settings)) settings.restrict = true
            if (!('jadibotmd' in settings)) settings.jadibotmd = true
            if (!('antiPrivate' in settings)) settings.antiPrivate = false
            if (!('autoread' in settings)) settings.autoread = false
        } else {
            global.db.data.settings[this.user.jid] = {
                self: false, restrict: true, jadibotmd: true, antiPrivate: false, autoread: false, status: 0
            }
        }

        const mainBot = global.conn.user.jid
        const chatData = global.db.data.chats[m.chat] || {};
        const isSubbs = chatData?.antiLag === true;
        const allowedBots = chatData?.per || []
        if (!allowedBots.includes(mainBot)) allowedBots.push(mainBot)
        const isAllowed = allowedBots.includes(this.user.jid)
        if (isSubbs && !isAllowed) return

        if (opts['nyimak']) return
        if (!m.fromMe && opts['self']) return
        if (opts['swonly'] && m.chat !== 'status@broadcast') return
        if (typeof m.text !== 'string') m.text = ''

        const _user = global.db.data.users[sender]
        const userObj = (m.isGroup ? participants.find((u) => cleanJid(u.jid) === cleanJid(sender)) : {}) || {}
        const botObj = (m.isGroup ? participants.find((u) => cleanJid(u.jid) === cleanJid(this.user.jid)) : {}) || {}

        const isRAdmin = userObj?.admin == "superadmin" || false
        const isAdmin = isRAdmin || userObj?.admin == "admin" || false
        const isBotAdmin = botObj?.admin || false

        const senderNum = sender.split('@')[0]
        const isROwner = [cleanJid(global.conn.user.id), ...global.owner.map(([number]) => number)].map(v => v.replace(/[^0-9]/g, '')).includes(senderNum)
        const isOwner = isROwner || m.fromMe
        const isMods = isOwner || global.mods.map(v => v.replace(/[^0-9]/g, '')).includes(senderNum)
        const isPrems = isROwner || global.prems.map(v => v.replace(/[^0-9]/g, '')).includes(senderNum) || _user.premium == true

        if (opts['queque'] && m.text && !(isMods || isPrems)) {
            let queque = this.msgqueque, time = 1000 * 5
            const previousID = queque[queque.length - 1]
            queque.push(m.id || m.key.id)
            setInterval(async function () {
                if (queque.indexOf(previousID) === -1) clearInterval(this)
                await delay(time)
            }, time)
        }

        m.exp += Math.ceil(Math.random() * 10)
        let usedPrefix

        const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins')
        for (let name in global.plugins) {
            let plugin = global.plugins[name]
            if (!plugin) continue
            if (plugin.disabled) continue
            const __filename = join(___dirname, name)

            if (typeof plugin.all === 'function') {
                try {
                    await plugin.all.call(this, m, { chatUpdate, __dirname: ___dirname, __filename })
                } catch (e) {
                    console.error(e)
                }
            }

            if (!opts['restrict']) {
                if (plugin.tags && plugin.tags.includes('admin')) continue
            }

            const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
            let _prefix = plugin.customPrefix ? plugin.customPrefix : conn.prefix ? conn.prefix : global.prefix
            let match = (_prefix instanceof RegExp ? [[_prefix.exec(m.text), _prefix]] : Array.isArray(_prefix) ? _prefix.map(p => { let re = p instanceof RegExp ? p : new RegExp(str2Regex(p)); return [re.exec(m.text), re] }) : typeof _prefix === 'string' ? [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]] : [[[], new RegExp]]).find(p => p[1])

            if (!match) continue

            if (typeof plugin.before === 'function') {
                if (await plugin.before.call(this, m, { match, conn: this, participants, groupMetadata, user: userObj, bot: botObj, isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems, from, who, targetJid: userId, chatUpdate, __dirname: ___dirname, __filename })) continue
            }

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

                    if (new Date() - userData.spam < 1500 && !isROwner) {
                        return
                    }
                    userData.spam = new Date() * 1
                }

                let hl = _prefix 
                let adminMode = global.db.data.chats[m.chat].modoadmin
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
                if (plugin.register == true && _user.registered == false) { fail('unreg', m, this); continue }

                m.isCommand = true
                let xp = 'exp' in plugin ? parseInt(plugin.exp) : 17 
                if (xp > 200) m.reply('chirrido -_-')
                else m.exp += xp

                if (!isPrems && plugin.coin && global.db.data.users[sender].coin < plugin.coin * 1) {
                    conn.reply(m.chat, `❮✦❯ Se agotaron tus ${moneda}`, m)
                    continue
                }

                if (plugin.level > _user.level) {
                    conn.reply(m.chat, `❮✦❯ Se requiere el nivel: *${plugin.level}*\n\n• Tu nivel actual es: *${_user.level}*\n\n• Usa este comando para subir de nivel:\n*${usedPrefix}levelup*`, m)       
                    continue
                }

                let extra = { match, usedPrefix, noPrefix, _args, args, command, text, conn: this, participants, groupMetadata, user: userObj, bot: botObj, isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems, from, who, targetJid: userId, chatUpdate, __dirname: ___dirname, __filename }
                
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
                    if (m.coin) conn.reply(m.chat, `❮✦❯ Utilizaste ${+m.coin} ${moneda || 'monedas'}`, m)
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

        let user, stats = global.db.data.stats
        if (m) { 
            const chat = global.db.data.chats[m.chat] ?? {};
            
            if (chat.users?.[sender]?.mute2) {
                const botObjFinal = (m.isGroup ? (groupCache.get(m.chat)?.participants || []).find(u => cleanJid(u.jid) === cleanJid(this.user.jid)) : {}) || {}
                const isBotAdminFinal = botObjFinal?.admin || false

                if (isBotAdminFinal) {
                    await this.sendMessage(m.chat, { delete: m.key }).catch(() => {})
                }
                return 
            }

            if (sender && (user = global.db.data.users[sender])) {
                user.exp += m.exp
                user.coin -= (m.coin ? m.coin * 1 : 0)
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

        const reactionRegex = /(ción|dad|aje|oso|izar|mente|pero|tion|age|ous|ate|and|but|ify|ai|yuki|a|s)/gi
        if (global.db.data.chats[m.chat]?.reaction && m.text.match(reactionRegex)) {
            const emotList = ["🍟", "😃", "😄", "😁", "😆", "🍓", "😅", "😂", "🤣", "🥲", "☺️", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "🌺", "🌸", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🌟", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "💫", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😶‍🌫️", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🫣", "🤭", "🤖", "🍭", "🤫", "🫠", "🤥", "😶", "📇", "😐", "💧", "😑", "🫨", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😮‍💨", "😵", "😵‍💫", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👺", "🧿", "🌩", "👻", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "🫶", "👍", "✌️", "🙏", "🫵", "🤏", "🤌", "☝️", "🖕", "🫂", "🐱", "🤹‍♀️", "🤹‍♂️", "🗿", "✨", "⚡", "🔥", "🌈", "🩷", "❤️", "🧡", "💛", "💚", "🩵", "💙", "💜", "🖤", "🩶", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "🚩", "👊", "⚡️", "💋", "🫰", "💅", "👑", "🐣", "🐤", "🐈"]
            const emot = emotList[Math.floor(Math.random() * emotList.length)]
            if (!m.fromMe) {
                this.sendMessage(m.chat, { react: { text: emot, key: m.key } })
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
