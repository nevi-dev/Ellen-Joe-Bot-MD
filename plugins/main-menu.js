//nevi-dev
import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import phoneNumber from 'awesome-phonenumber';
import { prepareWAMessageMedia, generateWAMessageFromContent } from '@whiskeysockets/baileys';

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = "⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄's 𝐒ervice";
const packname = '˚🄴🄻🄻🄴🄽-🄹🄾🄴-🄱🄾🅃';
const redes = 'https://github.com/nevi-dev';

// Imágenes para el menú
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

  // Sistema de comandos interactivo y completo
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

  // Obtener versión local
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
${sep}`.trim();

  // ---------------------------------------------------------
  // LÓGICA 1: SI EL USUARIO PIDE EL "ALL MENU" (TEXTO COMPLETO)
  // ---------------------------------------------------------
  if (text.trim().toLowerCase() === 'all') {
    const seccionesCompletas = allGroupNames.map(groupName => {
      const commandList = Array.from(comandosPorGrupo[groupName]).sort().map(cmd => ` ○ ${cmd}`).join('\n');
      return `\n🔷 *${groupName}*\n${commandList}`;
    }).join('\n');

    const textoFinal = `${encabezado}\n${seccionesCompletas}\n\n*— No me pidas nada más fuera de mi horario.*`;
    const thumbnailBuffer = Buffer.isBuffer(global.icons) ? global.icons : (fs.existsSync(global.icons) ? fs.readFileSync(global.icons) : Buffer.from(global.icons, 'base64'));

    await conn.relayMessage(m.chat, {
      extendedTextMessage: {
        text: `${redes}\n\n${textoFinal}`,
        matchedText: redes,
        canonicalUrl: redes,
        title: '🦈 𝙑𝙄𝘾𝙏𝙊𝙍𝙄𝘼 𝙃𝙊参𝙎𝙀𝙆𝙀𝙀𝙋𝙄𝙉𝙂',
        description: `✦ Aquí tienes todo, ${nombre}...`,
        previewType: 'shadow',
        jpegThumbnail: thumbnailBuffer,
        contextInfo: {
          quotedMessage: m.message,
          participant: m.sender,
          stanzaId: m.id,
          remoteJid: m.chat,
          isForwarded: true,
          forwardingScore: 999,
          forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 }
        }
      }
    }, { quoted: m });
    
    return; // Detiene la ejecución aquí para no enviar el menú de botones
  }

  // ---------------------------------------------------------
  // LÓGICA 2: MENÚ INTERACTIVO CON BOTONES Y LISTAS (POR DEFECTO)
  // ---------------------------------------------------------

  // Generar las filas de la lista divididas en 2 secciones para evitar límites de WhatsApp
  let listRows1 = [];
  let listRows2 = [];
  
  Object.keys(CATEGORY_GROUPS).forEach((group, index) => {
    let row = { 
      title: group, 
      description: `Explorar comandos de este sector`, 
      id: `${usedPrefix}help ${CATEGORY_GROUPS[group][0]}` // Usa tu comando base de ayuda
    };
    if (index < 9) listRows1.push(row);
    else listRows2.push(row);
  });

  let sections = [
    {
      title: "⚡ 𝐒𝐄𝐂𝐓𝐎𝐑𝐄𝐒 𝐏𝐑𝐈𝐍𝐂𝐈𝐏𝐀𝐋𝐄𝐒",
      rows: [
        { title: "🦈 MENÚ COMPLETO (ALL)", description: "Ver lista completa de todos los comandos", id: `${usedPrefix}menu all` },
        ...listRows1
      ]
    },
    {
      title: "⚡ 𝐎𝐓𝐑𝐎𝐒 𝐒𝐄𝐂𝐓𝐎𝐑𝐄𝐒",
      rows: listRows2
    }
  ];

  // Elegir imagen aleatoria
  let imgUrl = images[Math.floor(Math.random() * images.length)];
  let media = await prepareWAMessageMedia({ image: { url: imgUrl } }, { upload: conn.waUploadToServer });

  const interactiveMessage = {
    header: {
      title: "🦈 𝐄𝐋𝐋𝐄𝐍 𝐉𝐎𝐄 | 𝐒𝐄𝐑𝐕𝐈𝐂𝐄",
      hasMediaAttachment: true,
      imageMessage: media.imageMessage
    },
    body: {
      text: `${encabezado}\n\n*— Selecciona una opción en el menú inferior.*`
    },
    footer: { text: packname },
    nativeFlowMessage: {
      buttons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({ display_text: "🧧 Menú Completo", id: `${usedPrefix}menu all` })
        },
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({ title: "❀ 𝐒𝐄𝐂𝐓𝐎𝐑𝐄𝐒 𝐃𝐄 𝐍𝐄𝐖 𝐄𝐑𝐈𝐃𝐔", sections: sections })
        }
      ]
    }
  };

  let msg = generateWAMessageFromContent(m.chat, { 
    viewOnceMessage: { message: { interactiveMessage } } 
  }, { userJid: conn.user.jid });

  await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
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
