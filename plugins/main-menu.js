import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import axios from 'axios';
import moment from 'moment-timezone';
import { generateWAMessageFromContent } from '@whiskeysockets/baileys';

// Se eliminan las siguientes líneas (según solicitud de quitar el cooldown):
// const cooldowns = new Map();
// const ultimoMenuEnviado = new Map();

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏᴇ\'s 𝐒ervice';
const packname = '˚🄴🄻🄻🄴🄽-🄹🄾🄴-🄱🄾🅃';
const redes = 'https://github.com/nevi-dev'; // Asegúrate de que 'redes' esté definida (la he añadido aquí para que funcione el contextInfo)

// --- Global variable for repository info (customize this!) ---
const GITHUB_REPO_OWNER = 'nevi-dev';
const GITHUB_REPO_NAME = 'Ellen-Joe-Bot-MD-V2';
const GITHUB_BRANCH = 'main';

/**
 * Definición de las agrupaciones lógicas y sus emojis (FINAL).
 * Cambios: EMOX ahora es una categoría separada.
 */
const CATEGORY_GROUPS = {
  '👑 OWNER | PROPIETARIO': ['owner'],
  '🔌 SERBOT | CONEXIÓN REMOTA': ['serbot'],
  '🔞 NSFW | ADULTO': ['nsfw', '+18'], // EMOX ha sido removido
  '💖 EMOX | INTERACCIÓN': ['emox'], // CATEGORÍA NUEVA Y SEPARADA
  '⚔️ RPG | JUEGOS DE ROL': ['rpg'],
  '📝 RG | REGISTRO': ['rg'],
  '🎲 GACHA | WAIFUS': ['gacha', 'waifus'], 
  '🦈 MAIN | PRINCIPAL': ['main'],
  '⚙️ CONFIGURACIÓN': ['admin', 'mods'],
  '🛠️ TOOLS | HERRAMIENTAS': ['tools', 'herramientas', 'transformador', 'info', 'economy', 'economia', 'premium', 'bot'],
  '🧠 AI | INTELIGENCIA ARTIFICIAL': ['ai', 'search'],
  '🕹️ FUN | DIVERSIÓN Y JUEGOS': ['fun', 'game', 'games'], 
  '🖼️ PIC | IMÁGENES Y STICKERS': ['image', 'sticker'],
  '⬇️ DL | DESCARGAS': ['downloads', 'dl', 'buscador', 'internet'],
  '👥 GRUPO | CHATS': ['group'],
  '✨ ANIME | MULTIMEDIA': ['anime', 'audio'],
  '❓ OTROS | COMANDOS VARIOS': ['nable'], 
};

// Mapeo para asignar tags individuales a los grupos lógicos
const TAG_TO_GROUP = {};
for (const [groupName, tags] of Object.entries(CATEGORY_GROUPS)) {
  for (const tag of tags) {
    TAG_TO_GROUP[tag] = groupName;
  }
}


// Función principal del handler
let handler = async (m, { conn, usedPrefix, text }) => {
  // --- 1. Lectura de la base de datos de medios ---
  let enlacesMultimedia;
  try {
    const dbPath = path.join(process.cwd(), 'src', 'database', 'db.json');
    const dbRaw = fs.readFileSync(dbPath);
    enlacesMultimedia = JSON.parse(dbRaw).links;
  } catch (e) {
    console.error("Error al leer o parsear src/database/db.json:", e);
    return conn.reply(m.chat, 'Error al leer la base de datos de medios.', m);
  }

  if (m.quoted?.id && m.quoted?.fromMe) return;

  // --- 3. Obtener nombre del usuario ---
  let nombre;
  try {
    nombre = await conn.getName(m.sender);
  } catch {
    nombre = 'Usuario';
  }
  const horaSantoDomingo = moment().tz("America/Santo_Domingo").format('h:mm A');

  // --- 4. Recopilar información y construir el menú (Datos Estáticos) ---
  const esPrincipal = conn.user.jid === global.conn.user.jid;
  const numeroPrincipal = global.conn?.user?.jid?.split('@')[0] || "Desconocido";
  const totalComandos = Object.keys(global.plugins || {}).length;
  const tiempoActividad = clockString(process.uptime() * 1000);
  const totalRegistros = Object.keys(global.db?.data?.users || {}).length;

  const videoGifURL = enlacesMultimedia.video[Math.floor(Math.random() * enlacesMultimedia.video.length)];
  const miniaturaRandom = enlacesMultimedia.imagen[Math.floor(Math.random() * enlacesMultimedia.imagen.length)];

  // --- 5. Lógica de Paginación y Agrupación ---
  const CATEGORIES_PER_PAGE = 3;

  // 5.1. Recopilar Comandos por Grupo Lógico
  let comandosPorGrupo = {};
  for (let plugin of Object.values(global.plugins || {})) {
    if (!plugin.help || !plugin.tags) continue;
    
    const tagsArray = Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags];

    for (let tag of tagsArray) {
      const groupName = TAG_TO_GROUP[tag] || '❓ OTROS | COMANDOS VARIOS';
      if (!comandosPorGrupo[groupName]) comandosPorGrupo[groupName] = new Set();
      
      const helpArray = Array.isArray(plugin.help) ? plugin.help : [plugin.help];

      for (let help of helpArray) {
        if (/^\$|^=>|^>/.test(help)) continue;
        comandosPorGrupo[groupName].add(`${usedPrefix}${help}`);
      }
    }
  }

  // Convertir Sets a Arrays y ordenar
  for (let groupName in comandosPorGrupo) {
    comandosPorGrupo[groupName] = Array.from(comandosPorGrupo[groupName]).sort((a, b) => a.localeCompare(b));
  }

  // 5.2. Crear el listado de todos los nombres de grupos ordenados
  const allGroupNames = Object.keys(comandosPorGrupo).sort();
  
  const totalPaginas = Math.ceil(allGroupNames.length / CATEGORIES_PER_PAGE);
  let paginaActual = 1;
  
  const match = text.match(/pagina (\d+)/i);
  if (match) {
    const requestedPage = parseInt(match[1]);
    if (requestedPage >= 1 && requestedPage <= totalPaginas) {
      paginaActual = requestedPage;
    }
  }

  const startIndex = (paginaActual - 1) * CATEGORIES_PER_PAGE;
  const endIndex = startIndex + CATEGORIES_PER_PAGE;
  const gruposPagina = allGroupNames.slice(startIndex, endIndex);

  // 5.3. Construir la sección de comandos para la página actual con decoración NAVIDEÑA
  const secciones = gruposPagina.map(groupName => {
    const cmds = comandosPorGrupo[groupName];
    
    // Decoración para el título de la categoría (NAVIDEÑA)
    const title = `\n🎁❄️  **${groupName}**  ❄️🎁\n`;
    // Decoración para la lista de comandos (NAVIDEÑA)
    const commandList = cmds.map(cmd => `🎄 ${cmd}`).join('\n');
    
    return title + commandList;
  }).join('\n');

  // --- 6. Version Check Logic (Mantener) ---
  let localVersion = 'N/A';
  let serverVersion = 'N/A';
  let updateStatus = 'Desconocido';

  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJsonRaw = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonRaw);
    localVersion = packageJson.version || 'N/A';
  } catch (error) {
    localVersion = 'Error';
  }

  try {
    const githubPackageJsonUrl = `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/${GITHUB_BRANCH}/package.json`;
    const response = await axios.get(githubPackageJsonUrl);
    const githubPackageJson = response.data;
    serverVersion = githubPackageJson.version || 'N/A';

    if (localVersion !== 'N/A' && serverVersion !== 'N/A') {
      if (localVersion === serverVersion) {
        updateStatus = '✅ En última versión';
      } else {
        updateStatus = `⚠️ Actualización disponible. Actualiza con *${usedPrefix}update*`;
      }
    }
  } catch (error) {
    serverVersion = 'Error';
    updateStatus = '❌ No se pudo verificar la actualización';
  }
  // --- End Version Check Logic ---

  // --- 7. Construir Encabezado y Texto Final con decoración NAVIDEÑA ---
  // Nuevo separador Navideño
  const separadorNavidad = '🌟                               🌟';
  
  const encabezado = `
🎅  *«  N A V I D A D    E L L E N - J O E  »*   🎄
${separadorNavidad}
| 🧑‍🎄  *Usuario:*           ${nombre}
| 🎁  *Hora (R.D.):*       ${horaSantoDomingo}
${separadorNavidad}
| ❄️  *VERSION DEL BOT*
|      *Local:*             ${localVersion}
|      *Servidor:*          ${serverVersion}
| 🔔  *Estado:*            ${updateStatus}
${separadorNavidad}
| 🦌  *Bot:*               ${esPrincipal ? 'Principal' : `Sub-Bot | Principal: wa.me/${numeroPrincipal}`}
| ☃️  *Comandos Totales:*   ${totalComandos}
| 🕯️  *Tiempo Activo:*      ${tiempoActividad}
| 🏡  *Usuarios Reg:*      ${totalRegistros}
${separadorNavidad}
📜  *PÁGINA ${paginaActual} / ${totalPaginas}*   📜
${separadorNavidad}`.trim();

  const textoFinal = `${encabezado}\n${secciones}\n\n*${packname}*`;

  // --- 8. Preparar Botones de Paginación ---
  let botones = [];
  if (paginaActual > 1) {
    botones.push({
      buttonId: `${usedPrefix}prueba pagina ${paginaActual - 1}`,
      buttonText: { displayText: '« PÁGINA ANTERIOR ⬅️' }, // Botón Navideño
      type: 1
    });
  }
  if (paginaActual < totalPaginas) {
    botones.push({
      buttonId: `${usedPrefix}prueba pagina ${paginaActual + 1}`,
      buttonText: { displayText: 'PÁGINA SIGUIENTE ➡️' }, // Botón Navideño
      type: 1
    });
  }

  // --- 9. Enviar el mensaje con botones ---

  // 9.1. Descargar y preparar el video/gif como Buffer
  let videoBuffer;
  try {
    const response = await fetch(videoGifURL);
    videoBuffer = await response.buffer();
  } catch (e) {
    console.error("Error al descargar el video/gif:", e);
    // Si falla, se envía como solo texto.
  }
  
  const contextInfo = {
    mentionedJid: [m.sender],
    isForwarded: true,
    forwardingScore: 999,
    forwardedNewsletterMessageInfo: {
      newsletterJid,
      newsletterName,
      serverMessageId: -1
    },
    externalAdReply: {
      title: packname,
      body: `Página ${paginaActual} de ${totalPaginas} | ☃️ Menú Navideño`,
      thumbnailUrl: miniaturaRandom,
      sourceUrl: redes,
      mediaType: 1,
      renderLargerThumbnail: false
    }
  };

  let msgEnviado;
  
  if (videoBuffer && botones.length > 0) {
    try {
      // Usar sendMessage con botones
      msgEnviado = await conn.sendMessage(m.chat, { // Usar m.chat para el ID del chat
        video: videoBuffer,
        gifPlayback: true,
        caption: textoFinal,
        buttons: botones,
        headerType: 5,
        contextInfo
      }, { quoted: m });
    } catch (e) {
      console.error("Error al enviar el menú con video y botones:", e);
      // Fallback a solo texto/video sin botones si falla el envío del mensaje con botones
      msgEnviado = await conn.sendMessage(m.chat, {
        video: videoBuffer,
        gifPlayback: true,
        caption: textoFinal,
        contextInfo
      }, { quoted: m });
    }
  } else if (videoBuffer) {
    // Fallback a solo video (si no hay botones - solo 1 página)
    msgEnviado = await conn.sendMessage(m.chat, {
      video: videoBuffer,
      gifPlayback: true,
      caption: textoFinal,
      contextInfo
    }, { quoted: m });
  } else {
    // Último fallback a solo texto
    msgEnviado = await conn.reply(m.chat, textoFinal, m, { contextInfo });
  }

};

handler.help = ['menu'];
handler.tags = ['main'];
handler.command = ['menu', 'menú', 'help'];

export default handler;

function clockString(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}
