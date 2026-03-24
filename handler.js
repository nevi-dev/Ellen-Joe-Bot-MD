import { smsg } from './lib/simple.js';
import { format } from 'util';
import * as ws from 'ws';
import { fileURLToPath } from 'url';
import path, { join } from 'path';
import { unwatchFile, watchFile } from 'fs';
import chalk from 'chalk';
import fetch from 'node-fetch';
import failureHandler from './lib/respuesta.js';

const { proto } = (await import('@whiskeysockets/baileys')).default;
const isNumber = x => typeof x === 'number' && !isNaN(x);
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms));

const normalizeJid = jid => jid?.replace(/[^0-9]/g, '');
const cleanJid = jid => jid?.split(':')[0] || '';

// --- CONSTANTES OPTIMIZADAS ---
// Mover esto fuera evita que Node asigne memoria nueva por cada mensaje
const REACTION_REGEX = /(ción|dad|aje|oso|izar|mente|pero|tion|age|ous|ate|and|but|ify|ai|yuki|a|s)/gi;
const EMOTICONS = ["🍟", "😃", "😄", "😁", "😆", "🍓", "😅", "😂", "🤣", "🥲", "☺️", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "🌺", "🌸", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🌟", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "💫", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😶‍🌫️", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🫣", "🤭", "🤖", "🍭", "🤫", "🫠", "🤥", "😶", "📇", "😐", "💧", "😑", "🫨", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😮‍💨", "😵", "😵‍💫", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👺", "🧿", "🌩", "👻", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "🫶", "👍", "✌️", "🙏", "🫵", "🤏", "🤌", "☝️", "🖕", "🫂", "🐱", "🤹‍♀️", "🤹‍♂️", "🗿", "✨", "⚡", "🔥", "🌈", "🩷", "❤️", "🧡", "💛", "💚", "🩵", "💙", "💜", "🖤", "🩶", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "🚩", "👊", "⚡️", "💋", "🫰", "💅", "👑", "🐣", "🐤", "🐈"];
const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];

global.dfail = (type, m, conn) => {
    failureHandler(type, conn, m, global.comando);
};

export async function handler(chatUpdate) {
    this.msgqueque = this.msgqueque || [];
    this.uptime = this.uptime || Date.now();
    if (!chatUpdate) return;

    this.pushMessage(chatUpdate.messages).catch(console.error);
    let m = chatUpdate.messages[chatUpdate.messages.length - 1];
    if (!m) return;

    if (m.isGroup) {
        const chat = global.db.data.chats[m.chat];
        if (chat?.primaryBot) {
            const universalWords = ['resetbot', 'resetprimario', 'botreset'];
            const firstWord = (m.text || m.msg?.selectedButtonId || m.msg?.selectedId || '').trim().split(' ')[0].toLowerCase().replace(/^[./#]/, '');
            if (!universalWords.includes(firstWord) && this?.user?.jid !== chat.primaryBot) return;
        }
    }

    if (global.db.data == null) await global.loadDatabase();

    let sender;
    try {
        m = smsg(this, m) || m;
        if (!m) return;

        m.text = (
            m.text || 
            m.msg?.selectedButtonId || 
            m.msg?.selectedId || 
            m.msg?.contentText || 
            m.msg?.title || 
            m.msg?.body?.text || 
            ''
        ).trim();

        sender = m.isGroup ? (m.key.participant || m.sender) : m.key.remoteJid;

        // --- OPTIMIZACIÓN DE METADATOS ---
        // Extraemos los datos del grupo 1 sola vez por mensaje, no 3 veces.
        let groupMetadata = {};
        let participants = [];
        if (m.isGroup) {
            const meta = this.chats[m.chat]?.metadata || await this.groupMetadata(m.chat).catch(() => null) || {};
            groupMetadata = { ...meta };
            if (meta.participants) {
                participants = meta.participants.map(p => ({ id: p.jid, jid: p.jid, lid: p.lid, admin: p.admin }));
                groupMetadata.participants = participants;
            }
        }

        if (m.isGroup && sender.endsWith('@lid')) {
            const participantInfo = participants.find(p => p.lid === sender);
            if (participantInfo?.jid) sender = participantInfo.jid;
        }

        m.exp = 0;
        m.coin = false;

        // --- OPTIMIZACIÓN DE BASE DE DATOS ---
        // Uso de plantillas para rellenar variables rápidamente
        try {
            const defaultUser = {
                exp: 0, coin: 10, joincount: 1, diamond: 3, lastadventure: 0, health: 100,
                lastclaim: 0, lastcofre: 0, lastdiamantes: 0, lastcode: 0, lastduel: 0,
                lastpago: 0, lastmining: 0, lastcodereg: 0, muto: false, registered: false,
                genre: '', birth: '', marry: '', description: '', packstickers: null,
                name: m.name, age: -1, regTime: -1, afk: -1, afkReason: '', banned: false,
                useDocument: false, bank: 0, level: 0, role: 'Nuv', premium: false, premiumTime: 0
            };
            
            let user = global.db.data.users[sender];
            if (typeof user !== 'object') {
                user = global.db.data.users[sender] = { ...defaultUser };
            } else {
                for (const key in defaultUser) {
                    if (!(key in user)) user[key] = defaultUser[key];
                }
                ['exp', 'coin', 'joincount', 'diamond', 'health', 'bank', 'level', 'warn'].forEach(k => {
                    if (!isNumber(user[k])) user[k] = defaultUser[k] || 0;
                });
            }

            const defaultChat = {
                sAutoresponder: '', welcome: true, isBanned: false, autolevelup: false,
                autoresponder: false, delete: false, autoAceptar: false, autoRechazar: false,
                detect: true, antiBot: false, antiBot2: false, modoadmin: false, antiLink: true,
                antifake: false, reaction: false, nsfw: false, expired: 0, antiLag: false, per: []
            };
            
            let chat = global.db.data.chats[m.chat];
            if (typeof chat !== 'object') {
                chat = global.db.data.chats[m.chat] = { ...defaultChat };
            } else {
                for (const key in defaultChat) {
                    if (!(key in chat)) chat[key] = defaultChat[key];
                }
            }

            const defaultSettings = { self: false, restrict: true, jadibotmd: true, antiPrivate: false, autoread: false, status: 0 };
            let settings = global.db.data.settings[this.user.jid];
            
            if (typeof settings !== 'object') {
                settings = global.db.data.settings[this.user.jid] = { ...defaultSettings };
            } else {
                for (const key in defaultSettings) {
                    if (!(key in settings)) settings[key] = defaultSettings[key];
                }
            }
        } catch (e) {
            console.error("DB Init Error:", e);
        }

        const mainBot = global.conn.user.jid;
        const chatData = global.db.data.chats[m.chat];
        const allowedBots = chatData.per;
        if (!allowedBots.includes(mainBot)) allowedBots.push(mainBot);
        if (chatData.antiLag && !allowedBots.includes(this.user.jid)) return;

        if (opts['nyimak']) return;
        if (!m.fromMe && opts['self']) return;
        if (opts['swonly'] && m.chat !== 'status@broadcast') return;
        if (typeof m.text !== 'string') m.text = '';

        const _user = global.db.data.users[sender];
        const user = m.isGroup ? participants.find(u => this.decodeJid(u.jid) === sender) : {};
        const bot = m.isGroup ? participants.find(u => this.decodeJid(u.jid) === this.user.jid) : {};
        
        const isRAdmin = user?.admin === "superadmin";
        const isAdmin = isRAdmin || user?.admin === "admin";
        const isBotAdmin = bot?.admin;

        const senderNum = sender.split('@')[0];
        const isROwner = [conn.decodeJid(global.conn.user.id), ...global.owner.map(([n]) => n)].map(normalizeJid).includes(senderNum);
        const isOwner = isROwner || m.fromMe;
        const isMods = isOwner || global.mods.map(normalizeJid).includes(senderNum);
        const isPrems = isROwner || global.prems.map(normalizeJid).includes(senderNum) || _user.premium;

        if (opts['queque'] && m.text && !(isMods || isPrems)) {
            let queque = this.msgqueque, time = 5000;
            const previousID = queque[queque.length - 1];
            queque.push(m.id || m.key.id);
            setInterval(async function () {
                if (!queque.includes(previousID)) clearInterval(this);
                await delay(time);
            }, time);
        }

        if (m.isBaileys) return;
        m.exp += Math.ceil(Math.random() * 10);

        let usedPrefix;
        const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins');
        
        for (let name in global.plugins) {
            let plugin = global.plugins[name];
            if (!plugin || plugin.disabled) continue;
            
            const __filename = join(___dirname, name);
            if (typeof plugin.all === 'function') {
                try {
                    await plugin.all.call(this, m, { chatUpdate, __dirname: ___dirname, __filename });
                } catch (e) { console.error(e); }
            }
            
            if (!opts['restrict'] && plugin.tags?.includes('admin')) continue;

            const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
            let _prefix = plugin.customPrefix || conn.prefix || global.prefix;
            
            let match = (
                _prefix instanceof RegExp ? [[_prefix.exec(m.text), _prefix]] : 
                Array.isArray(_prefix) ? _prefix.map(p => { 
                    let re = p instanceof RegExp ? p : new RegExp(str2Regex(p)); 
                    return [re.exec(m.text), re]; 
                }) : 
                typeof _prefix === 'string' ? [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]] : 
                [[[], new RegExp()]]
            ).find(p => p[1]);

            if (!match) continue;

            if (typeof plugin.before === 'function') {
                if (await plugin.before.call(this, m, { match, conn: this, participants, groupMetadata, user, bot, isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems, chatUpdate, __dirname: ___dirname, __filename }))
                    continue;
            }
            
            if (typeof plugin !== 'function') continue;

            if ((usedPrefix = (match[0] || '')[0])) {
                let noPrefix = m.text.replace(usedPrefix, '');
                let [command, ...args] = noPrefix.trim().split` `.filter(v => v);
                let _args = noPrefix.trim().split` `.slice(1);
                let text = _args.join` `;
                command = (command || '').toLowerCase();
                let fail = plugin.fail || global.dfail;
                
                let isAccept = plugin.command instanceof RegExp ? plugin.command.test(command) : 
                               Array.isArray(plugin.command) ? plugin.command.some(cmd => cmd instanceof RegExp ? cmd.test(command) : cmd === command) : 
                               typeof plugin.command === 'string' ? plugin.command === command : false;

                global.comando = command;

                if (m.id.startsWith('NJX-') || (m.id.startsWith('BAE5') && m.id.length === 16) || (m.id.startsWith('B24E') && m.id.length === 20)) return;
                if (!isAccept) continue;

                m.plugin = name;
                
                if (chatData || _user) {
                    if (!['grupo-unbanchat.js'].includes(name) && chatData?.isBanned && !isROwner) return;
                    if (!['grupo-unbanchat.js', 'owner-exec.js', 'owner-exec2.js', 'grupo-delete.js'].includes(name) && chatData?.isBanned && !isROwner) return; 
                    
                    if (_user?.antispam > 2) return;
                    if (m.text && _user?.banned && !isROwner) {
                        m.reply(`《✦》Estas baneado/a, no puedes usar comandos en este bot!\n\n${_user.bannedReason ? `✰ *Motivo:* ${_user.bannedReason}` : '✰ *Motivo:* Sin Especificar'}\n\n> ✧ Si este Bot es cuenta oficial y tiene evidencia que respalde que este mensaje es un error, puedes exponer tu caso con un moderador.`);
                        _user.antispam++;
                        return;
                    }

                    if (_user?.antispam2 && isROwner) return;
                    if (new Date() - (_user?.spam || 0) < 3000) return console.log(`[ SPAM ]`);
                    _user.spam = new Date() * 1;

                    if (name !== 'grupo-unbanchat.js' && chatData?.isBanned) return; 
                    if (name !== 'owner-unbanuser.js' && _user?.banned) return;
                }

                let hl = _prefix; 
                let adminMode = chatData.modoadmin;
                let mini = `${plugins.botAdmin || plugins.admin || plugins.group || plugins || noPrefix || hl || m.text.slice(0, 1) == hl || plugins.command}`;
                if (adminMode && !isOwner && !isROwner && m.isGroup && !isAdmin && mini) return;   

                if (plugin.rowner && plugin.owner && !(isROwner || isOwner)) { fail('owner', m, this); continue; }
                if (plugin.rowner && !isROwner) { fail('rowner', m, this); continue; }
                if (plugin.owner && !isOwner) { fail('owner', m, this); continue; }
                if (plugin.mods && !isMods) { fail('mods', m, this); continue; }
                if (plugin.premium && !isPrems) { fail('premium', m, this); continue; }
                if (plugin.admin && !isAdmin) { fail('admin', m, this); continue; }
                if (plugin.botAdmin && !isBotAdmin) { fail('botAdmin', m, this); continue; }
                if (plugin.private && m.isGroup) { fail('private', m, this); continue; }
                if (plugin.group && !m.isGroup) { fail('group', m, this); continue; }
                if (plugin.register && !_user.registered) { fail('unreg', m, this); continue; }

                m.isCommand = true;
                let xp = 'exp' in plugin ? parseInt(plugin.exp) : 17; 
                if (xp > 200) m.reply('chirrido -_-');
                else m.exp += xp;

                if (!isPrems && plugin.coin && _user.coin < plugin.coin) {
                    conn.reply(m.chat, `❮✦❯ Se agotaron tus monedas`, m); // Ajusté a 'monedas' por defecto si la variable global moneda fallaba
                    continue;
                }
                if (plugin.level > _user.level) {
                    conn.reply(m.chat, `❮✦❯ Se requiere el nivel: *${plugin.level}*\n\n• Tu nivel actual es: *${_user.level}*\n\n• Usa este comando para subir de nivel:\n*${usedPrefix}levelup*`, m);
                    continue;
                }

                let extra = { match, usedPrefix, noPrefix, _args, args, command, text, conn: this, participants, groupMetadata, user, bot, isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems, chatUpdate, __dirname: ___dirname, __filename };
                
                try {
                    await plugin.call(this, m, extra);
                    if (!isPrems) m.coin = m.coin || plugin.coin || false;
                } catch (e) {
                    m.error = e;
                    console.error(e);
                    let errText = format(e);
                    for (let key of Object.values(global.APIKeys || {})) {
                        errText = errText.replace(new RegExp(key, 'g'), 'Administrador');
                    }
                    m.reply(errText);
                } finally {
                    if (typeof plugin.after === 'function') {
                        try { await plugin.after.call(this, m, extra); } 
                        catch (e) { console.error(e); }
                    }
                    if (m.coin) conn.reply(m.chat, `❮✦❯ Utilizaste ${+m.coin} monedas`, m);
                }
                break;
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        if (opts['queque'] && m.text) {
            const quequeIndex = this.msgqueque.indexOf(m.id || m.key.id);
            if (quequeIndex !== -1) this.msgqueque.splice(quequeIndex, 1);
        }
        
        let stats = global.db.data.stats;
        if (m) { 
            let utente = global.db.data.users[sender];
            if (utente?.muto) {
                await conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: m.key.id, participant: m.key.participant }});
            }
            if (sender && utente) {
                utente.exp += m.exp;
                if (m.coin) utente.coin -= m.coin;
            }

            if (m.plugin) {
                let now = +new Date();
                let stat = stats[m.plugin] || { total: 0, success: 0, last: 0, lastSuccess: 0 };
                
                stat.total += 1;
                stat.last = now;
                if (!m.error) {
                    stat.success += 1;
                    stat.lastSuccess = now;
                }
                stats[m.plugin] = stat;
            }
        }

        try {
            if (!opts['noprint']) {
                const printModule = await import(`./lib/print.js`);
                await printModule.default(m, this);
            }
        } catch (e) { 
            console.log(m, m.quoted, e);
        }
        
        if (opts['autoread']) await this.readMessages([m.key]);

        if (global.db.data.chats[m.chat]?.reaction && m.text.match(REACTION_REGEX)) {
            if (!m.fromMe) {
                this.sendMessage(m.chat, { react: { text: pickRandom(EMOTICONS), key: m.key } });
            }
        }
    }
}

const file = global.__filename ? global.__filename(import.meta.url, true) : fileURLToPath(import.meta.url);

watchFile(file, async () => {
    unwatchFile(file);
    console.log(chalk.green('Actualizando "handler.js"'));
    if (global.conns?.length > 0) {
        const users = [...new Set(global.conns.filter(conn => conn.user && conn.ws.socket && conn.ws.socket.readyState !== ws.CLOSED))];
        for (const userr of users) {
            userr.subreloadHandler(false);
        }
    }
});

export default { handler };
