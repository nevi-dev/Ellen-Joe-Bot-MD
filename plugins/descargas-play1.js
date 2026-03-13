import axios from 'axios';
import yts from "yt-search";
import fetch from 'node-fetch';
import ffmpeg from 'fluent-ffmpeg';
import { createWriteStream, promises as fs, existsSync, mkdirSync } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import path from 'path';

const streamPipeline = promisify(pipeline);
const API_BASE = 'https://rest.apicausas.xyz/api/v1/descargas/youtube';
const API_KEY = 'causa-ee5ee31dcfc79da4';

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const name = conn.getName(m.sender);
  args = args.filter(v => v?.trim());

  const globalContext = {
    mentionedJid: [m.sender],
    isForwarded: true,
    forwardingScore: 999,
    forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 }
  };

  if (!args[0]) return conn.reply(m.chat, `*— (Bostezo)*... ¿Qué quieres?`, m, { contextInfo: globalContext });

  const isMode = ["audio", "video"].includes(args[0].toLowerCase());
  const type = isMode ? args[0].toLowerCase() : null;
  const query = isMode ? args.slice(1).join(" ") : args.join(" ");

  if (isMode) {
    await m.react(type === 'audio' ? "🎧" : "📽️");
    
    try {
      const search = await yts(query);
      const vid = search.videos[0];
      if (!vid) throw new Error("Video no encontrado");

      // LIMPIEZA DE CARACTERES PARA WINDOWS
      const cleanTitle = vid.title.replace(/[\\/:*?"<>|]/g, "");
      const cleanAuthor = vid.author.name.replace(/[\\/:*?"<>|]/g, "");

      const response = await axios.get(`${API_BASE}?url=${encodeURIComponent(vid.url)}&type=${type}&apikey=${API_KEY}`);
      const res = response.data;

      if (res.status && res.data.download.url) {
        const downloadUrl = res.data.download.url;

        if (type === 'audio') {
          const tmpDir = path.join(process.cwd(), 'tmp');
          if (!existsSync(tmpDir)) mkdirSync(tmpDir);

          const timestamp = Date.now();
          const inputPath = path.join(tmpDir, `in_${timestamp}.mp3`);
          const thumbPath = path.join(tmpDir, `img_${timestamp}.jpg`);
          const outputPath = path.join(tmpDir, `out_${timestamp}.mp3`);

          // Descarga
          const [audioRes, thumbRes] = await Promise.all([fetch(downloadUrl), fetch(vid.thumbnail)]);
          await Promise.all([
            streamPipeline(audioRes.body, createWriteStream(inputPath)),
            streamPipeline(thumbRes.body, createWriteStream(thumbPath))
          ]);

          // FFmpeg con metadatos limpios
          await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
              .input(thumbPath)
              .outputOptions([
                '-map', '0:0', 
                '-map', '1:0', 
                '-c', 'copy', 
                '-id3v2_version', '3',
                '-metadata', `title=${cleanTitle}`,
                '-metadata', `artist=${cleanAuthor}`
              ])
              .on('error', (err) => {
                console.error('[FFMPEG ERROR]:', err);
                reject(err);
              })
              .on('end', resolve)
              .save(outputPath);
          });

          await conn.sendMessage(m.chat, { 
            audio: await fs.readFile(outputPath), 
            mimetype: "audio/mpeg", 
            fileName: `${cleanTitle}.mp3`
          }, { quoted: m });

          // Limpieza
          await Promise.all([
            fs.unlink(inputPath).catch(() => {}),
            fs.unlink(thumbPath).catch(() => {}),
            fs.unlink(outputPath).catch(() => {})
          ]);
          
          await m.react("✅");
        } else {
          await conn.sendMessage(m.chat, { video: { url: downloadUrl }, caption: `🎬 ${vid.title}`, mimetype: "video/mp4" }, { quoted: m });
          await m.react("📽️");
        }
      } else {
        throw new Error("API falló");
      }
    } catch (error) {
      console.error(error);
      await m.react("❌");
      return conn.reply(m.chat, `*— Tsk...* Algo se rompió: ${error.message}`, m);
    }
    return;
  }

  // Búsqueda inicial
  await m.react("🔍");
  const res = await yts(query);
  const video = res.videos[0];
  if (!video) return m.react("❌");

  const buttons = [
    { buttonId: `${usedPrefix}play audio ${video.url}`, buttonText: { displayText: '🎧 𝘼𝙐𝘿𝙄𝙊' }, type: 1 },
    { buttonId: `${usedPrefix}play video ${video.url}`, buttonText: { displayText: '🎬 𝙑𝙄𝘿𝙀𝙊' }, type: 1 }
  ];

  await conn.sendMessage(m.chat, {
    image: { url: video.thumbnail },
    caption: `> *Título:* ${video.title}\n> *Canal:* ${video.author.name}`,
    footer: 'Victoria Housekeeping Service',
    buttons,
    headerType: 4,
    contextInfo: globalContext
  }, { quoted: m });
};

handler.help = ['play'].map(v => v + ' <búsqueda>');
handler.tags = ['descargas'];
handler.command = ['play'];
handler.register = true;

export default handler;
