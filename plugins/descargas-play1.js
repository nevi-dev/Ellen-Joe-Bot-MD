import { exec } from 'child_process';
import fs from 'fs';
import axios from 'axios';
import yts from "yt-search";
import { promisify } from 'util';
import path from 'path';
import pkg from '@whiskeysockets/baileys';
const { generateWAMessageContent } = pkg;

const execPromise = promisify(exec);
const API_BASE = 'https://rest.apicausas.xyz/api/v1/descargas/youtubev2';
const API_KEY = 'causa-ee5ee31dcfc79da4';

// Configuración de Identidad
const githubLink = 'https://github.com/nevi-dev';
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⸙ְ̻࠭ꪆ 🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const name = conn.getName(m.sender);
  const tmpDir = './tmp';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  args = args.filter(v => v?.trim());

  // --- Lógica de Bypass para mensajes usando global.icons ---
  const sendEllenReply = async (txt) => {
    // Usamos directamente global.icons que ya es un Buffer aleatorio
    const mediaContent = await generateWAMessageContent(
      { image: global.icons }, 
      { upload: conn.waUploadToServer }
    );
    const imageMsg = mediaContent.imageMessage;

    await conn.relayMessage(m.chat, {
      extendedTextMessage: {
        text: `${txt}\n\n${githubLink}`,
        matchedText: githubLink,
        description: 'Victoria Housekeeping Service',
        title: '𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice 🦈',
        jpegThumbnail: global.icons, // Al ser Buffer, WA lo procesa directamente
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
    return sendEllenReply(`*— (Bostezo)*... ¿Ni siquiera sabes qué escuchar, ${name}?\n\n🎧 ᥱȷᥱm⍴ᥣ᥆:\n${usedPrefix}play *Linger*`);
  }

  const isMode = ["audio", "video"].includes(args[0].toLowerCase());
  const type = isMode ? args[0].toLowerCase() : null;
  const query = isMode ? args.slice(1).join(" ") : args.join(" ");

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
          await conn.sendMessage(m.chat, { 
            audio: fs.readFileSync(outputPath), 
            mimetype: 'audio/mp4', 
            fileName: `${title}.m4a`,
            ptt: false 
          }, { quoted: m });
        } else {
          await conn.sendMessage(m.chat, { 
            video: { url: downloadUrl }, 
            caption: `🎬 *Aquí tienes tu pedido.*\n\n> *Contenido:* ${title}`, 
            mimetype: "video/mp4" 
          }, { quoted: m });
        }

        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        await m.react("✅");
      }
    } catch (error) {
      console.error(error);
      await m.react("❌");
      return sendEllenReply(`*— Tsk...* Algo salió mal con la descarga.`);
    }
    return;
  }

  // --- BÚSQUEDA ---
  await m.react("🔍");
  const searchResult = await yts(query);
  const video = searchResult.videos?.[0];
  if (!video) return sendEllenReply(`*— No encontré nada.*`);

  const caption = `₊‧꒰ 🦈 ꒱ 𝙀𝙇𝙇𝙀𝙉 𝙅𝙊𝙀 𝙎𝙀𝙍𝙑𝙄𝘾𝙀\n\n> *Título:* ${video.title}\n> *Uploader:* ${video.author.name}\n> *Duración:* ${video.timestamp}\n\n*— Elige si quieres audio o video.*`.trim();

  // Para la búsqueda usamos la miniatura del video, pero con el Bypass de nitidez
  const mediaSearch = await generateWAMessageContent(
    { image: { url: video.thumbnail } }, 
    { upload: conn.waUploadToServer }
  );
  const imgSearchMsg = mediaSearch.imageMessage;
  const { data: thumbVideo } = await conn.getFile(video.thumbnail);

  await conn.relayMessage(m.chat, {
    extendedTextMessage: {
      text: `${caption}\n\n${githubLink}`,
      matchedText: githubLink,
      description: 'Victoria Housekeeping Service',
      title: '𝙀𝙇𝙇𝙀𝙉 𝙋𝙇𝘼𝙔 𝙎𝙀𝙍𝙑𝙄𝘾𝙀 🦈',
      jpegThumbnail: thumbVideo,
      thumbnailDirectPath: imgSearchMsg.directPath,
      thumbnailSha256: imgSearchMsg.fileSha256,
      thumbnailEncSha256: imgSearchMsg.fileEncSha256,
      mediaKey: imgSearchMsg.mediaKey,
      mediaKeyTimestamp: imgSearchMsg.mediaKeyTimestamp,
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

handler.help = ['play <búsqueda>'];
handler.tags = ['descargas'];
handler.command = ['play'];
handler.register = true;

export default handler;
