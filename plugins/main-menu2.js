//nevi-dev
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import moment from 'moment-timezone';
import pkg from '@whiskeysockets/baileys';
const { generateWAMessageContent } = pkg;

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';
const packname = '˚🄴🄻🄻🄴🄽-🄹🄾🄴-🄱🄾🅃';
const redes = 'https://github.com/nevi-dev';

const images = [
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/086ec8e8-c373-45b6-ad51-3cdaef9cd3e6.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/c99835de-0c28-4e27-93a0-422df6cca849.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/6eee1198-1b0f-4cfe-b6c0-2fb82dc0bdc5.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/18b2ad5d-a091-4267-8903-bb895dbefe6c.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/23912e87-2b42-468c-bfd4-a4df62951c10.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/7d874ab7-8a4c-4d76-b7dc-dfbcb589bd9b.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/42f1cc96-bcd5-4c43-ac58-96883dba3047.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/407e16b8-89d4-4d09-bd2f-a606ccc0e53c.jpg?raw=true"
];

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

  // 4. Lógica de Bypass Newsletter (Igual que robarwaifu)
  try {
    const randomImage = images[Math.floor(Math.random() * images.length)];
    const { data: thumb } = await conn.getFile(randomImage);
    const messageContent = await generateWAMessageContent(
      { image: { url: randomImage } },
      { upload: conn.waUploadToServer }
    );
    const imageMsg = messageContent.imageMessage;

    const content = {
      extendedTextMessage: {
        text: `${encabezado}\n\n${redes}`,
        matchedText: redes,
        description: "Victoria Housekeeping Audio System",
        title: "𝐄llen 𝐉ᴏ𝐄's 𝐕𝐨𝐢𝐜𝐞 🦈",
        previewType: 0,
        jpegThumbnail: thumb,
        thumbnailDirectPath: imageMsg.directPath,
        thumbnailSha256: imageMsg.fileSha256,
        thumbnailEncSha256: imageMsg.fileEncSha256,
        mediaKey: imageMsg.mediaKey,
        mediaKeyTimestamp: imageMsg.mediaKeyTimestamp,
        thumbnailHeight: 720,
        thumbnailWidth: 1280,
        contextInfo: {
          mentionedJid: [m.sender],
          isForwarded: true,
          forwardingScore: 1,
          forwardedNewsletterMessageInfo: {
            newsletterJid,
            newsletterName,
            serverMessageId: -1
          }
        }
      }
    };
    await conn.relayMessage(m.chat, content, { quoted: m });
  } catch (e) {
    console.error(e);
    await conn.reply(m.chat, encabezado, m);
  }
};

handler.help = ['menu2', 'audios on', 'audios off'];
handler.tags = ['main'];
handler.command = ['menu2', 'menuaudios', 'audios'];

export default handler;
