import fetch from "node-fetch";
import axios from 'axios';

// Configuración de la nueva API
const CAUSA_API_KEY = 'causa-ee5ee31dcfc79da4';
const CAUSA_ENDPOINT = 'https://rest.apicausas.xyz/api/v1/descargas/tiktok';

const SIZE_LIMIT_MB = 100;
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐞 𖥔 Sᥱrvice';

// --- Funciones de Utilidad ---
const sendMediaFile = async (conn, m, downloadUrl, title, currentMode) => {
  try {
    const response = await axios.head(downloadUrl);
    const contentLength = response.headers['content-length'];
    const fileSizeMb = contentLength / (1024 * 1024);

    let mediaOptions = {};

    if (fileSizeMb > SIZE_LIMIT_MB) {
      mediaOptions = {
        document: { url: downloadUrl },
        fileName: `${title}.${currentMode === 'audio' ? 'mp3' : 'mp4'}`,
        mimetype: currentMode === 'audio' ? 'audio/mpeg' : 'video/mp4',
        caption: `⚠️ *Archivo pesado (${fileSizeMb.toFixed(2)} MB)*. Enviado como documento.\n🖤 *Título:* ${title}`
      };
      await conn.sendMessage(m.chat, mediaOptions, { quoted: m });
      await m.react("📄");
    } else {
      mediaOptions = currentMode === 'audio'
        ? { audio: { url: downloadUrl }, mimetype: "audio/mpeg", fileName: `${title}.mp3` }
        : { video: { url: downloadUrl }, caption: `🎬 *Aquí tienes.*\n🖤 *Título:* ${title}`, fileName: `${title}.mp4`, mimetype: "video/mp4" };

      await conn.sendMessage(m.chat, mediaOptions, { quoted: m });
      await m.react(currentMode === 'audio' ? "🎧" : "📽️");
    }
  } catch (error) {
    console.error("Error en el envío:", error);
    throw new Error("No se pudo enviar el archivo.");
  }
};

// --- Manejador Principal ---
const handler = async (m, { conn, args, usedPrefix, command }) => {
  const name = conn.getName(m.sender);
  args = args.filter(v => v?.trim());

  const contextInfo = {
    mentionedJid: [m.sender],
    isForwarded: true,
    forwardingScore: 999,
    forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 },
    externalAdReply: {
      title: '🖤 ⏤͟͟͞͞𝙀𝙇𝙇𝙀𝙉 - 𝘽𝙊𝙏 ᨶ႒ᩚ',
      body: `✦ Esperando tu solicitud, ${name}.`,
      thumbnail: icons, // Asegúrate de que 'icons' esté definido
      sourceUrl: redes, // Asegúrate de que 'redes' esté definido
      mediaType: 1,
      renderLargerThumbnail: false
    }
  };

  if (!args[0]) {
    return conn.reply(m.chat, `🦈 *¿᥎іᥒіs𝗍ᥱ ᥲ ⍴ᥱძіrmᥱ ᥲᥣg᥆ sіᥒ sᥲᑲᥱr 𝗊ᥙᥱ́?*\n${usedPrefix}tiktok https://vt.tiktok.com/ZSmrDCvrS/`, m, { contextInfo });
  }

  // Detectar si el usuario especificó "audio" o "video" antes del link
  const isMode = ["audio", "video"].includes(args[0].toLowerCase());
  const type = isMode ? (args[0].toLowerCase() === "audio" ? "mp3" : "mp4") : "info";
  const queryOrUrl = isMode ? args[1] : args[0];

  await m.react("🔎");

  try {
    // Construcción de la URL para la API (GET)
    const apiUrl = `${CAUSA_ENDPOINT}?apikey=${CAUSA_API_KEY}&url=${encodeURIComponent(queryOrUrl)}&type=${type}`;
    
    const res = await fetch(apiUrl);
    const json = await res.json();

    if (!json.status) {
        throw new Error(`API Error: ${json.msg || 'No se pudo obtener el contenido.'}`);
    }

    const data = json.data;

    if (isMode) {
      // Modo Descarga (Audio o Video)
      if (data.download && data.download.url) {
        await sendMediaFile(conn, m, data.download.url, data.titulo, args[0].toLowerCase());
      } else {
        throw new Error("No se encontró el enlace de descarga directa.");
      }
    } else {
      // Modo Info (Vista previa con botones)
      const caption = `
┈۪۪۪۪۪۪۪۪ٜ̈᷼─۪۪۪۪ٜ࣪᷼┈۪۪۪۪۪۪۪۪ٜ݊᷼⁔᮫ּׅ̫ׄ࣪︵᮫ּ๋ׅׅ۪۪۪۪ׅ࣪࣪͡⌒🌀𔗨⃪̤̤̤ٜ۫۫۫҈҈҈҈҉҉᷒ᰰ꤬۫۫۫𔗨̤̤̤𐇽─۪۪۪۪ٜ᷼┈۪۪۪۪۪۪۪۪ٜ̈᷼─۪۪۪۪ٜ࣪᷼┈۪۪۪۪݊᷼
₊‧꒰ 🎧꒱ 𝙀𝙇𝙇𝙀𝙉 𝙅𝙊𝙀 𝘽𝙊𝙏 — 𝙄𝙉𝙁𝙊 ✧˖°
︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶   ︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶

> 👤 *Autor:* ${data.autor || data.nickname}
> 💬 *Título:* ${data.titulo || 'Sin título'}
> ⏱️ *Duración:* ${data.duracion || '---'}
> 👁️ *Vistas:* ${data.vistas?.toLocaleString() || '0'}

Elije cómo quieres que lo descargue... ┐(￣ー￣)┌`;

      const buttons = [
        { buttonId: `${usedPrefix}tiktok video ${queryOrUrl}`, buttonText: { displayText: '🎬 𝙑𝙄𝘿𝙀𝙊' }, type: 1 },
        { buttonId: `${usedPrefix}tiktok audio ${queryOrUrl}`, buttonText: { displayText: '🎧 𝘼𝙐𝘿𝙄𝙊' }, type: 1 }
      ];

      await conn.sendMessage(m.chat, {
        image: { url: data.thumbnail },
        caption,
        footer: '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐞 𖥔 Sᥱrvice',
        buttons,
        headerType: 4,
        contextInfo
      }, { quoted: m });
    }

  } catch (e) {
    console.error(e);
    return conn.reply(m.chat, `💔 *Error:* ${e.message}`, m);
  }
};

handler.help = ['tiktok'].map(v => v + ' <URL>');
handler.tags = ['descargas'];
handler.command = ['tiktok'];
handler.register = true;

export default handler;
