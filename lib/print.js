import PhoneNumber from 'awesome-phonenumber';
import chalk from 'chalk';
import { watchFile } from 'fs';

const terminalImage = global.opts['img'] ? require('terminal-image') : '';
const urlRegex = (await import('url-regex-safe')).default({ strict: false });

export default async function (m, conn = { user: {} }) {
    let _name = await conn.getName(m.sender);
    let sender = PhoneNumber('+' + m.sender.replace('@s.whatsapp.net', '')).getNumber('international') + (_name ? ' ~' + _name : '');
    let chat = await conn.getName(m.chat);
    let img;
    try {
        if (global.opts['img']) {
            img = /sticker|image/gi.test(m.mtype) ? await terminalImage.buffer(await m.download()) : false;
        }
    } catch (e) {
        console.error(e);
    }
    
    let filesize = (m.msg ?
        m.msg.vcard ? m.msg.vcard.length :
        m.msg.fileLength ? m.msg.fileLength.low || m.msg.fileLength :
        m.msg.axolotlSenderKeyDistributionMessage ? m.msg.axolotlSenderKeyDistributionMessage.length :
        m.text ? m.text.length : 0 :
        m.text ? m.text.length : 0) || 0;

    // --- SEGURIDAD: EVITAR CRASHES (LEVEL/EXP) ---
    let user = global.db.data.users[m.sender] || {};
    let uExp = user.exp || 0;
    let uLim = user.limit || 0;
    let uLvl = user.level || 0;
    // ---------------------------------------------

    let me = PhoneNumber('+' + (conn.user?.jid || '').replace('@s.whatsapp.net', '')).getNumber('international');
    let oraAttuale = new Date();
    let oraTime = oraAttuale.toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let chatName = chat ? (m.isGroup ? 'Sectores de Nueva Eridu: ' + chat : 'Enlace Directo: ' + chat) : '';
    
    // DISEÑO PERSONALIZADO: ELLEN JOE (Victoria Housekeeping Co.)
    console.log(`╭─── [ VICTORIA HOUSEKEEPING ] ──···
│ 🦈 ${chalk.black.bgRed(' ELLEN JOE ')} 
│ 🕒 Hora: ${chalk.redBright(oraTime)}
│ 📂 Tipo: ${chalk.white(m.messageStubType ? m.messageStubType : 'Mensaje')}
│ 📦 Peso: ${chalk.redBright(filesize === 0 ? '0 B' : (filesize / 1000 ** Math.floor(Math.log(filesize) / Math.log(1000))).toFixed(1) + (['', ...'KMGTP'][Math.floor(Math.log(filesize) / Math.log(1000))] || '') + 'B')}
│ 👤 De: ${chalk.white(sender)}
│ 📊 Status: ${chalk.redBright('LVL: ' + uLvl)} | ${chalk.white('EXP: ' + uExp)} | ${chalk.redBright('LIMIT: ' + uLim)}
│ 📍 Chat: ${chalk.redBright(chatName)}
│ 🎮 MType: ${chalk.white(m.mtype ? m.mtype.replace(/message$/i, '').replace('audio', m.msg?.ptt ? 'PTT' : 'audio').replace(/^./, v => v.toUpperCase()) : 'Unknown')}
╰────────────────────────────────···
`.trim());

    if (img) console.log(img.trimEnd());
    
    if (typeof m.text === 'string' && m.text) {
        let log = m.text.replace(/\u200e+/g, '');
        let mdRegex = /(?<=(?:^|[\s\n])\S?)(?:([*_~])(.+?)\1|```((?:.||[\n\r])+?)```)(?=\S?(?:[\s\n]|$))/g;
        let mdFormat = (depth = 4) => (_, type, text, monospace) => {
            let types = { _: 'italic', '*': 'bold', '~': 'strikethrough' };
            text = text || monospace;
            return !types[type] || depth < 1 ? text : chalk[types[type]](text.replace(mdRegex, mdFormat(depth - 1)));
        };
        
        log = log.replace(urlRegex, (url) => chalk.red(url));
        log = log.replace(mdRegex, mdFormat(4));
        
        if (m.mentionedJid) {
            for (let userJid of m.mentionedJid) {
                log = log.replace('@' + userJid.split`@` [0], chalk.redBright('@' + await conn.getName(userJid)));
            }
        }
        // Si es comando, color dorado/amarillo como las señales de ZZZ
        console.log(m.error != null ? chalk.red.bold('✖ Error: ' + log) : m.isCommand ? chalk.yellowBright('⚡ [Comando]: ' + log) : '💬 ' + log);
    }

    // Parámetros de sistema (cuando alguien se une, etc)
    if (m.messageStubParameters && m.messageStubParameters.length > 0) {
        console.log(chalk.gray('  └─ ' + m.messageStubParameters.map(jid => {
            let name = conn.getName(conn.decodeJid(jid));
            return name ? `@${name}` : jid;
        }).join(', ')));
    }

    if (/audio/i.test(m.mtype)) {
        const duration = m.msg.seconds;
        console.log(chalk.redBright(`  🎧 [Audio - ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, 0)}]`));
    }
    console.log();
}

let file = global.__filename(import.meta.url);
watchFile(file, () => {
    console.log(chalk.redBright("🦈 Ellen Joe dice: 'Actualizando lib/print.js'... no me hagas trabajar de más."));
});
