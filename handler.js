import { smsg } from './lib/simple.js'
import { format } from 'util'
import * as ws from 'ws';
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'
import fetch from 'node-fetch'
import failureHandler from './lib/respuesta.js';

const { proto } = (await import('@whiskeysockets/baileys')).default
const isNumber = x => typeof x === 'number' && !isNaN(x)
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(function () {
    clearTimeout(this)
    resolve()
}, ms))

// Limpieza de JID para comparaciones exactas
const cleanJid = jid => jid?.split(':')[0] + '@s.whatsapp.net'

global.dfail = (type, m, conn) => {
    failureHandler(type, conn, m, global.comando);
};

export async function handler(chatUpdate) {
    this.msgqueque = this.msgqueque || []
    this.uptime = this.uptime || Date.now()
    if (!chatUpdate) return

    this.pushMessage(chatUpdate.messages).catch(console.error)
    let m = chatUpdate.messages[chatUpdate.messages.length - 1]
    if (!m) return

    if (global.db.data == null) await global.loadDatabase()

    // --- FILTRO DE BOT PRIMARIO ---
    if (m.isGroup) {
        const chat = global.db.data.chats[m.chat]
        if (chat?.primaryBot) {
            const myJid = cleanJid(this.user.jid)
            const primaryJid = cleanJid(chat.primaryBot)
            const universalWords = ['resetbot', 'resetprimario', 'botreset']
            const firstWord = m.text ? m.text.trim().split(' ')[0].toLowerCase().replace(/^[./#]/, '') : ''
            
            // Si no es el primario Y no es un comando universal, ignorar todo
            if (myJid !== primaryJid && !universalWords.includes(firstWord)) return
        }
    }

    // --- MANEJO DE BOTONES INTEGRADO ---
    const btnMsg = m.message?.buttonsResponseMessage || m.message?.templateButtonReplyMessage || m.message?.listResponseMessage;
    if (btnMsg) {
        const command = btnMsg.selectedButtonId || btnMsg.singleSelectReply?.selectedRowId || btnMsg.selectedRowId;
        if (command) {
            m.message = { conversation: command };
            m.text = command;
            const senderId = m.participant || m.key.participant || m.key.remoteJid;
            Object.defineProperty(m, 'sender', { value: senderId, writable: true, configurable: true, enumerable: true });
        }
    }

    let sender;
    try {
        m = smsg(this, m) || m
        if (!m) return

        sender = m.isGroup ? (m.key.participant ? m.key.participant : m.sender) : m.key.remoteJid;

        // ... (Lógica de LID y participantes igual)
        const groupMetadata_lid = m.isGroup ? { ...(this.chats[m.chat]?.metadata || await this.groupMetadata(m.chat).catch(_ => null) || {}), ...(((this.chats[m.chat]?.metadata || await this.groupMetadata(m.chat).catch(_ => null) || {}).participants) && { participants: ((this.chats[m.chat]?.metadata || await this.groupMetadata(m.chat).catch(_ => null) || {}).participants || []).map(p => ({ ...p, id: p.jid, jid: p.jid, lid: p.lid })) }) } : {}
        const participants_lid = ((m.isGroup ? groupMetadata_lid.participants : []) || []).map(participant => ({ id: participant.jid, jid: participant.jid, lid: participant.lid, admin: participant.admin }))
        if (m.isGroup && sender.endsWith('@lid')) {
            const participantInfo = participants_lid.find(p => p.lid === sender);
            if (participantInfo && participantInfo.jid) sender = participantInfo.jid; 
        }

        // --- INICIALIZACIÓN DE BASE DE DATOS ---
        m.exp = 0
        m.coin = false
        try {
            let user = global.db.data.users[sender]
            if (typeof user !== 'object') global.db.data.users[sender] = {}
            if (user) {
                if (!isNumber(user.exp)) user.exp = 0
                if (!isNumber(user.coin)) user.coin = 10
                if (!isNumber(user.bank)) user.bank = 0
                if (!isNumber(user.level)) user.level = 0
                if (!('banned' in user)) user.banned = false
                if (!('registered' in user)) user.registered = false
            } else {
                global.db.data.users[sender] = { exp: 0, coin: 10, bank: 0, level: 0, registered: false, banned: false, name: m.name }
            }

            let chat = global.db.data.chats[m.chat]
            if (typeof chat !== 'object') global.db.data.chats[m.chat] = {}
            if (chat) {
                if (!('isBanned' in chat)) chat.isBanned = false
                if (!('antiLink' in chat)) chat.antiLink = true
            } else {
                global.db.data.chats[m.chat] = { isBanned: false, antiLink: true }
            }
        } catch (e) { console.error(e) }

        const _user = global.db.data.users[sender]
        const groupMetadata = m.isGroup ? { ...(this.chats[m.chat]?.metadata || await this.groupMetadata(m.chat).catch(_ => null) || {}), ...(((this.chats[m.chat]?.metadata || await this.groupMetadata(m.chat).catch(_ => null) || {}).participants) && { participants: ((this.chats[m.chat]?.metadata || await this.groupMetadata(m.chat).catch(_ => null) || {}).participants || []).map(p => ({ ...p, id: p.jid, jid: p.jid, lid: p.lid })) }) } : {}
        const participants = ((m.isGroup ? groupMetadata.participants : []) || []).map(participant => ({ id: participant.jid, jid: participant.jid, lid: participant.lid, admin: participant.admin }))
        
        const user = (m.isGroup ? participants.find((u) => u.jid === sender) : {}) || {}
        const bot = (m.isGroup ? participants.find((u) => u.jid == cleanJid(this.user.jid)) : {}) || {}
        
        const isAdmin = user?.admin == "superadmin" || user?.admin == "admin" || false
        const isBotAdmin = bot?.admin || false
        const senderNum = sender.split('@')[0];
        const isROwner = [cleanJid(global.conn.user.id), ...global.owner.map(([number]) => number)].map(v => v.replace(/[^0-9]/g, '')).includes(senderNum);
        const isOwner = isROwner || m.fromMe
        const isPrems = isROwner || _user.premium == true

        // --- COMANDOS NATIVOS: BANCHAT / UNBANCHAT ---
        if (m.text && m.isGroup) {
            let pref = /^[./#!]/.test(m.text) ? m.text.charAt(0) : '';
            let rawCmd = m.text.slice(pref.length).trim().split(' ')[0].toLowerCase();

            if (rawCmd === 'banchat') {
                if (!isOwner && !isAdmin) return m.reply('❌ No tienes permisos.');
                global.db.data.chats[m.chat].isBanned = true;
                return m.reply('✅ Grupo baneado.');
            }
            if (rawCmd === 'unbanchat') {
                if (!isOwner && !isAdmin) return m.reply('❌ No tienes permisos.');
                global.db.data.chats[m.chat].isBanned = false;
                return m.reply('✅ Grupo desbaneado.');
            }
        }

        if (m.isGroup && global.db.data.chats[m.chat]?.isBanned && !isROwner) return;

        // --- PROCESADOR DE PLUGINS ---
        let usedPrefix
        const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins')
        
        for (let name in global.plugins) {
            let plugin = global.plugins[name]
            if (!plugin || plugin.disabled) continue

            const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
            let _prefix = plugin.customPrefix ? plugin.customPrefix : global.prefix
            let match = (_prefix instanceof RegExp ? [[_prefix.exec(m.text), _prefix]] : Array.isArray(_prefix) ? _prefix.map(p => { let re = p instanceof RegExp ? p : new RegExp(str2Regex(p)); return [re.exec(m.text), re] }) : typeof _prefix === 'string' ? [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]] : [[[], new RegExp]]).find(p => p[1])

            if (!match) continue
            if ((usedPrefix = (match[0] || '')[0])) {
                let noPrefix = m.text.replace(usedPrefix, '')
                let [command, ...args] = noPrefix.trim().split` `.filter(v => v)
                command = (command || '').toLowerCase()
                let isAccept = plugin.command instanceof RegExp ? plugin.command.test(command) : Array.isArray(plugin.command) ? plugin.command.some(cmd => cmd instanceof RegExp ? cmd.test(command) : cmd === command) : typeof plugin.command === 'string' ? plugin.command === command : false

                if (!isAccept) continue
                global.comando = command

                // Validaciones de permisos
                if (plugin.rowner && !isROwner) { fail('rowner', m, this); continue }
                if (plugin.admin && !isAdmin) { fail('admin', m, this); continue }
                if (plugin.botAdmin && !isBotAdmin) { fail('botAdmin', m, this); continue }
                if (plugin.group && !m.isGroup) { fail('group', m, this); continue }

                try {
                    await plugin.call(this, m, { match, usedPrefix, noPrefix, args, command, text: args.join(' '), conn: this, participants, groupMetadata, user, bot, isROwner, isOwner, isAdmin, isBotAdmin, isPrems })
                } catch (e) {
                    console.error(e)
                    m.reply(format(e))
                }
                break
            }
        }
    } catch (e) { console.error(e) }
}

const file = global.__filename(import.meta.url, true);
watchFile(file, async () => {
    unwatchFile(file);
    console.log(chalk.green('Actualizando "handler.js"'));
});

export default { handler }
