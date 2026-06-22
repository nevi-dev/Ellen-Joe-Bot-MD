import fetch from "node-fetch";
import axios from 'axios';
import fsSync from 'fs';

const CAUSA_API_KEY = 'causa-ee5ee31dcfc79da4';
const CAUSA_ENDPOINT = 'https://rest.apicausas.xyz/api/v1/descargas/tiktok';
const SIZE_LIMIT_MB = 100;

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = "⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄's 𝐒ervice";


const handler = async (m, { conn, args, usedPrefix, command }) => {
  const name = conn.getName(m.sender);
    args = args.filter(v => v?.trim());

  const matchedUrl = 'https://github.com/nevi-dev';
  const thumbnailBuffer = Buffer.isBuffer(global.icons)
    ? global.icons
    : (fsSync.existsSync(global.icons) ? fsSync.readFileSync(global.icons) : Buffer.from(global.icons, 'base64'));

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

  if (!args[0]) {
    return await sendExternalMessage(`*— (Bostezo)*... ¿Viniste a pedirme algo sin saber qué?\n\n🎧 ᥱȷᥱm⍴ᥣ᥆:\n${usedPrefix}${command} https://vt.tiktok.com/ZSmrDCvrS/`);
  }

  const isMode = ["audio", "video"].includes(args[0].toLowerCase());
  const type = isMode ? (args[0].toLowerCase() === "audio" ? "mp3" : "mp4") : "info";
  const queryOrUrl = isMode ? args[1] : args[0];

  await m.react("🔎");

  try {
    const apiUrl = `${CAUSA_ENDPOINT}?apikey=${CAUSA_API_KEY}&url=${encodeURIComponent(queryOrUrl)}&type=${type}`;
    const res = await fetch(apiUrl);
    const json = await res.json();

    if (!json.status) throw new Error(json.msg || 'No se pudo obtener el contenido.');
    const data = json.data;

    if (isMode) {
      const downloadUrl = data.download?.url;
      if (!downloadUrl) throw new Error("No se encontró el enlace de descarga.");

      const response = await axios.head(downloadUrl);
      const fileSizeMb = (parseInt(response.headers['content-length']) || 0) / (1024 * 1024);

      if (fileSizeMb > SIZE_LIMIT_MB) {
        await conn.sendMessage(m.chat, {
          document: { url: downloadUrl },
          fileName: `${data.titulo || 'tiktok'}.${type === 'mp3' ? 'mp3' : 'mp4'}`,
          mimetype: type === 'mp3' ? 'audio/mpeg' : 'video/mp4',
          caption: `⚠️ *Archivo pesado (${fileSizeMb.toFixed(2)} MB)*.\n\n> *Título:* ${data.titulo}`
        }, { quoted: m });
      } else {
        const media = type === 'mp3' 
          ? { audio: { url: downloadUrl }, mimetype: "audio/mpeg", fileName: `tiktok.mp3` }
          : { video: { url: downloadUrl }, caption: `🎬 *Aquí tienes.*\n\n> *Título:* ${data.titulo}`, mimetype: "video/mp4" };
        
        await conn.sendMessage(m.chat, media, { quoted: m });
      }
      await m.react("✅");

    } else {
      const vistasStr = (data.vistas !== undefined && data.vistas !== null) 
                        ? data.vistas.toLocaleString() 
                        : '0';
      
      const caption = `₊‧꒰ 🦈 ꒱ 𝙏𝙄𝙆𝙏𝙊𝙆 𝙄𝙉𝙁𝙊\n\n> *Autor:* ${data.autor || 'Desconocido'}\n> *Título:* ${data.titulo || 'Sin título'}\n> *Duración:* ${data.duracion || '---'}\n> *Vistas:* ${vistasStr}\n\n*— Elige si quieres audio o video.*`;

      const buttons = [
        { buttonId: `${usedPrefix}${command} video ${queryOrUrl}`, buttonText: { displayText: '🎬 𝙑𝙄𝘿𝙀𝙊' }, type: 1 },
        { buttonId: `${usedPrefix}${command} audio ${queryOrUrl}`, buttonText: { displayText: '🎧 𝘼𝙐𝘿𝙄𝙊' }, type: 1 }
      ];

      await conn.sendMessage(m.chat, {
        image: { url: data.thumbnail || global.icons },
        caption,
        footer: 'Victoria Housekeeping Service',
        buttons,
        headerType: 4,
        contextInfo: {
            mentionedJid: [m.sender],
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid,
                newsletterName,
                serverMessageId: -1
            }
        }
      }, { quoted: m });
    }

  } catch (e) {
    console.error(e);
    await m.react("❌");
    await sendExternalMessage(`*— Tsk...* Falló el servicio: ${e.message}`);
  }
};

handler.help = ['tiktok <URL>'];
handler.tags = ['descargas'];
handler.command = ['tiktok', 'tt'];
handler.register = true;

export default handler;
