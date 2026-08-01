import db from '../database.js'
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

    // --- SEGURIDAD ANTI-CRASH (LID BUG) ---
    let user = db.data.users[m.sender] || {};
    let uExp = user.exp || 0;
    let uLim = user.limit || 0;
    let uLvl = user.level || 0;

    // INFO DEL BOT RECEPTOR
    let botNumber = conn.user?.jid ? PhoneNumber('+' + conn.user.jid.replace('@s.whatsapp.net', '')).getNumber('international') : '??';
    let botName = conn.user?.name || 'Ellen Joe';

    // HORA REPÚBLICA DOMINICANA AM/PM
    let oraRD = new Date().toLocaleString('en-US', { 
        timeZone: 'America/Santo_Domingo', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: true 
    });

    let chatName = chat ? (m.isGroup ? 'Sector: ' + chat : 'Enlace Privado') : 'Nueva Eridu';
    
    // DISEÑO EXCLUSIVO DE ELLEN JOE
    console.log(`╭─── [ 🦈 ${chalk.black.bgRed(' VICTORIA HOUSEKEEPING ')} ] ──···
│ 🤖 ${chalk.redBright('BOT RECEPTOR:')} ${chalk.white(botNumber)} ${chalk.gray('(' + botName + ')')}
│ 🕒 ${chalk.redBright('HORA:')} ${chalk.white(oraRD)}
│ 📂 ${chalk.redBright('TIPO:')} ${chalk.white(m.messageStubType ? m.messageStubType : 'MENSAJE')}
│ ⌨  ${chalk.redBright('PESO:')} ${chalk.white(filesize + ' [' + (filesize === 0 ? 0 : (filesize / 1000 ** Math.floor(Math.log(filesize) / Math.log(1000))).toFixed(1)) + (['', ...'KMGTP'][Math.floor(Math.log(filesize) / Math.log(1000))] || '') + 'B]') }
│ ✦  ${chalk.redBright('DE:')} ${chalk.white(sender)}
│ ⚑  ${chalk.redBright('STATS:')} ${chalk.black.bgWhite(' LVL ' + uLvl + ' ')} ${chalk.black.bgWhite(' EXP ' + uExp + ' ')} ${chalk.black.bgWhite(' LIM ' + uLim + ' ')}
│ ❑  ${chalk.redBright('UBICACIÓN:')} ${chalk.white(chatName)}
│ 🍭 ${chalk.redBright('PROTOCOLO:')} ${chalk.white(m.mtype ? m.mtype.replace(/message$/i, '').replace('audio', m.msg?.ptt ? 'PTT' : 'audio').replace(/^./, v => v.toUpperCase()) : 'Unknown')}
╰─────────────────────────────────────────────────···
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
        
        log = log.replace(urlRegex, (url) => chalk.redBright.underline(url));
        log = log.replace(mdRegex, mdFormat(4));
        
        if (m.mentionedJid) {
            for (let userJid of m.mentionedJid) {
                log = log.replace('@' + userJid.split`@` [0], chalk.redBright('@' + await conn.getName(userJid)));
            }
        }
        
        // Estilo de mensajes en consola
        console.log(m.error != null ? chalk.red.bold('✖ ' + log) : m.isCommand ? chalk.redBright('⚡ ' + log) : '💬 ' + log);
    }

    // Parámetros adicionales
    if (m.messageStubParameters && m.messageStubParameters.length > 0) {
        console.log(chalk.gray('  └─ ') + m.messageStubParameters.map(jid => {
            jid = conn.decodeJid(jid)
            let name = conn.getName(jid)
            const phoneNumber = PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
            return name ? chalk.redBright(`${phoneNumber} (${name})`) : ''
        }).filter(Boolean).join(', '))
    }

    if (/audio/i.test(m.mtype)) {
        const duration = m.msg.seconds;
        console.log(`${m.msg.ptt ? '🎤' : '🎵'} ${chalk.redBright('AUDIO REPRODUCIDO')} [${Math.floor(duration / 60).toString().padStart(2, 0)}:${(duration % 60).toString().padStart(2, 0)}]`)
    }
    console.log();
}

let file = global.__filename(import.meta.url);
watchFile(file, () => {
    console.log(chalk.redBright("🦈 Ellen Joe: 'Nueva Eridu actualizada... deja de molestar con el código'."));
});
