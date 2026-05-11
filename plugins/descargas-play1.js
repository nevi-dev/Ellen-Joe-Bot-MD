import { exec } from 'child_process';
import fs from 'fs';
import axios from 'axios';
import yts from "yt-search";
import { promisify } from 'util';
import path from 'path';
import pkg from '@whiskeysockets/baileys';
const { generateWAMessageContent, prepareWAMessageMedia, generateWAMessageFromContent, proto } = pkg;

const execPromise = promisify(exec);
const API_BASE = 'https://rest.apicausas.xyz/api/v1/descargas/youtubev2';
const API_KEY = 'causa-ee5ee31dcfc79da4';

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⸙ְ̻࠭ꪆ 🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const name = conn.getName(m.sender);
  const tmpDir = './tmp';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  args = args.filter(v => v?.trim());

  // --- Respuesta Base Ellen (Errores/Guía) ---
  const sendEllenReply = async (txt) => {
    const mediaContent = await generateWAMessageContent({ image: global.icons }, { upload: conn.waUploadToServer });
    const imageMsg = mediaContent.imageMessage;
    await conn.relayMessage(m.chat, {
      extendedTextMessage: {
        text: txt,
        jpegThumbnail: global.icons,
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
          forwardingScore: 999,
          forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 }
        }
      }
    }, { quoted: m });
  };

  if (!args[0]) {
    return sendEllenReply(`『🦈』*— (Bostezo)*... ¿Qué quieres escuchar ahora, *${name}*?\n\n🎧 *Usa:* ${usedPrefix}${command} <nombre o link>`);
  }

  const isMode = ["audio", "video"].includes(args[0].toLowerCase());
  const type = isMode ? args[0].toLowerCase() : null;
  const query = isMode ? args.slice(1).join(" ") : args.join(" ");

  // --- DESCARGA DIRECTA ---
  if (isMode) {
    await m.react(type === 'audio' ? "🎧" : "🎬");
    try {
      const response = await axios.get(`${API_BASE}?url=${encodeURIComponent(query)}&type=${type}&apikey=${API_KEY}`);
      const res = response.data;
      if (res.status && res.data.download.url) {
        const { title, download: { url: downloadUrl } } = res.data;
        const fileName = `${Date.now()}`;
        const inputPath = path.join(tmpDir, `${fileName}_in`);
        const outputPath = path.join(tmpDir, `${fileName}.${type === 'audio' ? 'm4a' : 'mp4'}`);

        const fileRes = await axios({ url: downloadUrl, method: 'GET', responseType: 'stream' });
        const writer = fs.createWriteStream(inputPath);
        fileRes.data.pipe(writer);
        await new Promise(res => writer.on('finish', res));

        if (type === 'audio') {
          await execPromise(`ffmpeg -i "${inputPath}" -c copy -movflags +faststart "${outputPath}"`);
          await conn.sendMessage(m.chat, { audio: fs.readFileSync(outputPath), mimetype: 'audio/mp4', fileName: `${title}.m4a`, ptt: false }, { quoted: m });
        } else {
          await conn.sendMessage(m.chat, { video: { url: downloadUrl }, caption: `🎬 *Aquí tienes.*\n\n> *Contenido:* ${title}`, mimetype: "video/mp4" }, { quoted: m });
        }
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        await m.react("✅");
      }
    } catch (e) { return sendEllenReply(`『❌』*— Tsk...* Algo salió mal.`); }
    return;
  }

  // --- BÚSQUEDA Y RENDERIZADO ---
  await m.react("🔍");
  const isUrl = query.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  let video;
  if (isUrl) {
    video = await yts({ videoId: isUrl[1] });
  } else {
    const searchResult = await yts(query);
    video = searchResult.videos?.[0];
  }

  if (!video) return sendEllenReply(`『🦈』*— No encontré nada.*`);

  // DECO BONITA
  const caption = `
『🦈』 *𝙀𝙇𝙇𝙀𝙉 𝙋𝙇𝘼𝙔 𝙎𝙀𝙍𝙑𝙄𝘾𝙀*
⏤͟͞ू⃪፝͜⁞⟡ Victoria Housekeeping

∫ 🎬 *Título:* ${video.title}
∫ 👤 *Autor:* ${video.author.name}
∫ ⌛ *Duración:* ${video.timestamp}

*— Elige rápido, tengo un batido esperando.*`.trim();

  // IMAGEN DE YOUTUBE (Cabecera)
  const mediaYT = await prepareWAMessageMedia({ image: { url: video.thumbnail } }, { upload: conn.waUploadToServer });

  const message = generateWAMessageFromContent(m.chat, {
    viewOnceMessage: {
      message: {
        interactiveMessage: proto.Message.InteractiveMessage.fromObject({
          body: proto.Message.InteractiveMessage.Body.fromObject({
            // Solo URL de YT para renderizado nítido
            text: `${caption}\n\n${video.url}` 
          }),
          footer: proto.Message.InteractiveMessage.Footer.fromObject({
            text: "𝐄llen 𝐉ᴏ𝐄's 𝐒ervice 🦈"
          }),
          header: proto.Message.InteractiveMessage.Header.fromObject({
            hasMediaAttachment: true,
            imageMessage: mediaYT.imageMessage
          }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
            buttons: [
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "🎧 𝘼𝙐𝘿𝙄𝙊",
                  id: `${usedPrefix}${command} audio ${video.url}`
                })
              },
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "🎬 𝙑𝙄𝘿𝙀𝙊",
                  id: `${usedPrefix}${command} video ${video.url}`
                })
              }
            ]
          }),
          contextInfo: {
            mentionedJid: [m.sender],
            isForwarded: true,
            forwardingScore: 999,
            forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 },
            // Bypass de Ellen en el AdReply
            externalAdReply: {
              title: '𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice 🦈',
              body: 'Victoria Housekeeping Service',
              thumbnail: global.icons,
              sourceUrl: video.url, // Usamos la URL del video también aquí
              mediaType: 1,
              renderLargerThumbnail: true
            }
          }
        })
      }
    }
  }, { quoted: m });

  await conn.relayMessage(m.chat, message.message, { messageId: message.key.id });
};

handler.help = ['play'];
handler.tags = ['descargas'];
handler.command = ['play'];
handler.register = true;

export default handler;
