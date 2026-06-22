//nevi-dev
import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';
const packname = '˚🄴🄻🄻🄴🄽-🄹🄾🄴-🄱🄾🅃';
const redes = 'https://github.com/nevi-dev';


let handler = async (m, { conn, usedPrefix, text, command }) => {
  let chat = global.db.data.chats[m.chat];

  // 1. Lógica de Activación/Desactivación
  if (text === 'on') {
    chat.audios = true;
    return m.reply('✅ **Servicio de audios activado.**');
  }
  if (text === 'off') {
    chat.audios = false;
    return m.reply('❌ **Servicio de audios desactivado.**');
  }

  // 2. Carga de Bases de Datos
  let db_audios = [];
  try {
    const audioPath = path.join(process.cwd(), 'src', 'database', 'audios.json');
    db_audios = JSON.parse(fs.readFileSync(audioPath, 'utf-8'));
  } catch (e) {
    return conn.reply(m.chat, '❌ Error al cargar la base de datos de audios.', m);
  }

  // 3. Construcción de la Lista
  const listaAudios = db_audios.map((audio, index) => {
    const keys = audio.keywords.join(' / ');
    const icon = audio.convert === false ? '📂' : '🎙️';
    return `*${index + 1}.* ${icon} ${keys}`;
  }).join('\n');

  const horaRD = moment().tz("America/Santo_Domingo").format('h:mm A');
  const estadoAudios = chat.audios ? '✅ ACTIVO' : '❌ DESACTIVO';
  const sep = '——————————————————';

  const encabezado = `
🦈 **𝐄𝐋𝐋𝐄𝐍 𝐉𝐎𝐄 | 𝐀𝐔𝐃𝐈𝐎 𝐒𝐄𝐑𝐕𝐈𝐂𝐄**
${sep}
*— (Bostezo)... Aquí están mis servicios de voz.*
*No me pidas que cante, solo di la palabra.*

📢 **ESTADO:** ${estadoAudios}
⌚ **HORA:** ${horaRD} (RD)
🎙️ **TOTAL:** ${db_audios.length} Audios
${sep}
⚙️ **CONTROLES:**
| 🔓 \`${usedPrefix}audios on\`
| 🔒 \`${usedPrefix}audios off\`
${sep}

${listaAudios}

${sep}
*— Si no respondo, es que estoy en mi descanso.*`.trim();

  const name = await conn.getName(m.sender);
  const matchedUrl = redes;
  const thumbnailBuffer = Buffer.isBuffer(global.icons)
    ? global.icons
    : (fs.existsSync(global.icons) ? fs.readFileSync(global.icons) : Buffer.from(global.icons, 'base64'));

  const sendExternalMessage = async (msgText) => {
    await conn.relayMessage(m.chat, {
      extendedTextMessage: {
        text: `${matchedUrl}\n\n${msgText}`,
        matchedText: matchedUrl,
        canonicalUrl: matchedUrl,
        title: '🦈 𝙑𝙄𝘾𝙏𝙊𝙍𝙄𝘼 𝙃𝙊参𝙎𝙀𝙆𝙀𝙀𝙋𝙄𝙉𝙂',
        description: `✦ ¿Necesitas algo, ${name}? Date prisa...`,
        previewType: 'shadow',
        jpegThumbnail: thumbnailBuffer,
        contextInfo: {
          quotedMessage: m.message,
          participant: m.sender,
          stanzaId: m.id,
          remoteJid: m.chat,
          isForwarded: true,
          forwardingScore: 999,
          forwardedNewsletterMessageInfo: {
            newsletterJid,
            newsletterName,
            serverMessageId: -1
          }
        }
      }
    }, { quoted: m });
  };

  await sendExternalMessage(encabezado);
};

handler.help = ['menu2', 'audios on', 'audios off'];
handler.tags = ['main'];
handler.command = ['menu2', 'menuaudios', 'audios'];

export default handler;
