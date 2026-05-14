//nevi-dev
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import moment from 'moment-timezone';
import phoneNumber from 'awesome-phonenumber';
import pkg from '@whiskeysockets/baileys';
const { generateWAMessageContent } = pkg;

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = "⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄's 𝐒ervice";
const packname = '˚🄴🄻🄻🄴🄽-🄹🄾🄴-🄱🄾🅃';
const redes = 'https://github.com/nevi-dev';

// Las imágenes que pasaste para el bypass aleatorio
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

const CATEGORY_GROUPS = {
  '🦈 VICTORIA HOUSEKEEPING | OWNER': ['owner'],
  '🔌 CONEXIÓN DE RED | SERBOT': ['serbot'],
  '🔞 ZONA RESTRINGIDA | NSFW': ['nsfw', '+18'],
  '💖 INTERACCIÓN EMOX': ['emox'],
  '⚔️ INCURSIÓN EN CAVIDAD | RPG': ['rpg'],
  '📝 REGISTRO DE CIUDADANO': ['rg'],
  '🎲 SINTONIZACIÓN | GACHA': ['gacha', 'waifus'], 
  '🏙️ NEW ERIDU | PRINCIPAL': ['main'],
  '⚙️ PROTOCOLO DE ADMIN': ['admin', 'mods'],
  '🛠️ SOPORTE TÉCNICO | TOOLS': ['tools', 'herramientas', 'transformador', 'info', 'economy', 'economia', 'premium', 'bot'],
  '🧠 INTELIGENCIA ARTIFICIAL': ['ai', 'search'],
  '🕹️ ENTRETENIMIENTO | FUN': ['fun', 'game', 'games'], 
  '🖼️ CONTENIDO VISUAL | PIC': ['image', 'sticker'],
  '⬇️ DESCARGAS | DOWNLOADS': ['downloads', 'dl', 'buscador', 'internet'],
  '👥 GESTIÓN DE FACCIÓN | GRUPOS': ['group'],
  '✨ ARCHIVOS MULTIMEDIA': ['anime', 'audio'],
  '⚙️ configuracion': ['nable'], 
};

const TAG_TO_GROUP = {};
for (const [groupName, tags] of Object.entries(CATEGORY_GROUPS)) {
  for (const tag of tags) { TAG_TO_GROUP[tag] = groupName; }
}

let handler = async (m, { conn, usedPrefix, text }) => {
  let nombre = await conn.getName(m.sender);
  
  // Lógica de hora
  let userTime;
  try {
    const pn = new phoneNumber('+' + m.sender.split('@')[0]);
    const tzList = pn.getRegionCode() ? moment.tz.zonesForCountry(pn.getRegionCode()) : [];
    userTime = tzList.length > 0 ? moment().tz(tzList[0]).format('h:mm A') : moment().format('h:mm A');
  } catch {
    userTime = moment().format('h:mm A');
  }

  // Sistema de comandos
  let comandosPorGrupo = {};
  Object.values(global.plugins).forEach(plugin => {
    if (!plugin.help || !plugin.tags) return;
    const tags = Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags];
    const help = Array.isArray(plugin.help) ? plugin.help : [plugin.help];
    tags.forEach(tag => {
      const groupName = TAG_TO_GROUP[tag] || '❓ OTROS SECTORES';
      if (!comandosPorGrupo[groupName]) comandosPorGrupo[groupName] = new Set();
      help.forEach(h => { if (!/^\$|^=>|^>/.test(h)) comandosPorGrupo[groupName].add(`${usedPrefix}${h}`); });
    });
  });

  const allGroupNames = Object.keys(comandosPorGrupo).sort();
  const CATEGORIES_PER_PAGE = 3;
  const totalPaginas = Math.ceil(allGroupNames.length / CATEGORIES_PER_PAGE);
  let paginaActual = 1;
  const match = text.match(/pagina (\d+)/i);
  if (match) paginaActual = Math.max(1, Math.min(parseInt(match[1]), totalPaginas));

  const startIndex = (paginaActual - 1) * CATEGORIES_PER_PAGE;
  const gruposPagina = allGroupNames.slice(startIndex, startIndex + CATEGORIES_PER_PAGE);
  const secciones = gruposPagina.map(groupName => {
    const commandList = Array.from(comandosPorGrupo[groupName]).sort().map(cmd => ` ○ ${cmd}`).join('\n');
    return `\n🔷 *${groupName}*\n${commandList}`;
  }).join('\n');

  let localVersion = '1.0.0';
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    localVersion = pkg.version;
  } catch (e) {}

  const sep = '——————————————————';
  const encabezado = `
🦈 **𝐄𝐋𝐋𝐄𝐍 𝐉𝐎𝐄 | 𝐒𝐄𝐑𝐕𝐈𝐂𝐄 𝐌𝐄𝐍𝐔**
${sep}
*— (Bostezo)... Bienvenid@ a New Eridu.*

👤 **Proxy:** ${nombre}
⌚ **Hora:** ${userTime}
${sep}
⚙️ **𝐒𝐘𝐒𝐓𝐄𝐌 𝐈𝐍𝐅𝐎**
| 🛠️ **Build:** v${localVersion}
| ⏳ **Uptime:** ${clockString(process.uptime() * 1000)}
| 📑 **Comandos:** ${Object.keys(global.plugins).length}
${sep}
📑 **𝐒𝐄𝐂𝐓𝐎𝐑:** ${paginaActual} / ${totalPaginas}
${sep}`.trim();

  const textoFinal = `${encabezado}\n${secciones}\n\n*— No me pidas nada más fuera de mi horario.*`;

  // --- LÓGICA DE BYPASS (COMO EN ROBARWAIFU) ---
  const sendBypassMenu = async (text) => {
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
          text: `${text}\n\n${redes}`,
          matchedText: redes,
          description: "Victoria Housekeeping Service - ZZZ",
          title: "𝐄llen 𝐉ᴏ𝐄's 𝐒ervice 🦈",
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
      console.error('Error menu bypass:', e);
      await conn.reply(m.chat, text, m);
    }
  };

  // 1. Enviar el menú con bypass
  await sendBypassMenu(textoFinal);

  // 2. Enviar botones (Mensaje aparte)
  let buttons = [
    { buttonId: `${usedPrefix}menu`, buttonText: { displayText: '🔄 REFRESCAR' }, type: 1 }
  ];

  if (paginaActual > 1) {
    buttons.push({ buttonId: `${usedPrefix}menu pagina ${paginaActual - 1}`, buttonText: { displayText: '⬅️ ANTERIOR' }, type: 1 });
  }
  if (paginaActual < totalPaginas) {
    buttons.push({ buttonId: `${usedPrefix}menu pagina ${paginaActual + 1}`, buttonText: { displayText: 'SIGUIENTE ➡️' }, type: 1 });
  }

  await conn.sendMessage(m.chat, {
    text: `*Navegación de Sectores:*`,
    footer: packname,
    buttons: buttons,
    headerType: 1
  }, { quoted: m });
};

handler.help = ['menu'];
handler.tags = ['main'];
handler.command = ['menu', 'menú', 'help'];

export default handler;

function clockString(ms) {
  let h = Math.floor(ms / 3600000);
  let m = Math.floor(ms / 60000) % 60;
  let s = Math.floor(ms / 1000) % 60;
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}
