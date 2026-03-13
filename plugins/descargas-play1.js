import axios from 'axios';
import yts from "yt-search";
import fetch from 'node-fetch';
import ffmpeg from 'fluent-ffmpeg';
import { createWriteStream, promises as fs } from 'fs';
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
    forwardedNewsletterMessageInfo: {
      newsletterJid,
      newsletterName,
      serverMessageId: -1
    }
  };

  if (!args[0]) {
    return conn.reply(m.chat, `*— (Bostezo)*... ¿Viniste a pedirme algo sin siquiera saber qué? No soy adivina.\n\n🎧 ᥱȷᥱm⍴ᥣ᥆:\n${usedPrefix}play *Linger - The Cranberries*`, m, { contextInfo: { ...globalContext, externalAdReply: { title: '🦈 𝙑𝙄𝘾𝙏𝙊𝙍𝙄𝘼 𝙃𝙊𝙐𝙎𝙀𝙆𝙀𝙀𝙋𝙄𝙉𝙂', body: `— Suspiro... ¿Qué quieres ahora, ${name}?`, thumbnail: icons, sourceUrl: redes, mediaType: 1, renderLargerThumbnail: false } } });
  }

  const isMode = ["audio", "video"].includes(args[0].toLowerCase());
  const type = isMode ? args[0].toLowerCase() : null;
  const query = isMode ? args.slice(1).join(" ") : args.join(" ");

  if (isMode) {
    await m.react(type === 'audio' ? "🎧" : "📽️");
    try {
      const search = await yts(query);
      const vid = search.videos[0];
      const title = vid?.title || 'Audio';
      const author = vid?.author?.name || 'Desconocido';
      const thumbUrl = vid?.thumbnail;

      const response = await axios.get(`${API_BASE}?url=${encodeURIComponent(vid.url)}&type=${type}&apikey=${API_KEY}`);
      const res = response.data;

      if (res.status && res.data.download.url) {
        const downloadUrl = res.data.download.url;

        if (type === 'audio') {
          const tmpDir = './tmp';
          if (!(await fs.stat(tmpDir).catch(() => false))) await fs.mkdir(tmpDir);

          const inputPath = path.join(tmpDir, `in_${Date.now()}.mp3`);
          const thumbPath = path.join(tmpDir, `img_${Date.now()}.jpg`);
          const outputPath = path.join(tmpDir, `out_${Date.now()}.mp3`);

          // Descarga de archivos a tmp
          const audioRes = await fetch(downloadUrl);
          await streamPipeline(audioRes.body, createWriteStream(inputPath));
          const thumbRes = await fetch(thumbUrl);
          await streamPipeline(thumbRes.body, createWriteStream(thumbPath));

          // FFmpeg para incrustar carátula y metadatos
          await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
              .input(thumbPath)
              .outputOptions([
                '-map 0:0',
                '-map 1:0',
                '-c copy',
                '-id3v2_version 3',
                `-metadata title=${JSON.stringify(title)}`,
                `-metadata artist=${JSON.stringify(author)}`
              ])
              .save(outputPath)
              .on('end', resolve)
              .on('error', reject);
          });

          await conn.sendMessage(m.chat, { 
            audio: await fs.readFile(outputPath), 
            mimetype: "audio/mpeg", 
            fileName: `${title}.mp3`
          }, { quoted: m });

          // Limpieza selectiva
          await Promise.all([fs.unlink(inputPath), fs.unlink(thumbPath), fs.unlink(outputPath)]);
          await m.react("🎧");
        } else {
          await conn.sendMessage(m.chat, { 
            video: { url: downloadUrl }, 
            caption: `🎬 *Aquí tienes.*\n\n🦈 *Contenido:* ${title}`, 
            mimetype: "video/mp4" 
          }, { quoted: m });
          await m.react("📽️");
        }
      } else {
        throw new Error("Respuesta de API inválida");
      }
      return;
    } catch (error) {
      await m.react("❌");
      return conn.reply(m.chat, `*— Tsk...* El servidor de descargas respondió con error.`, m);
    }
  }

  await m.react("🔍");
  let video;
  try {
    const searchResult = await yts(query);
    video = searchResult.videos?.[0];
  } catch (e) { return conn.reply(m.chat, `*— Error en búsqueda.*`, m); }

  if (!video) return conn.reply(m.chat, `*— No hay nada.*`, m);

  const buttons = [
    { buttonId: `${usedPrefix}play audio ${video.url}`, buttonText: { displayText: '🎧 𝘼𝙐𝘿𝙄𝙊' }, type: 1 },
    { buttonId: `${usedPrefix}play video ${video.url}`, buttonText: { displayText: '🎬 𝙑𝙄𝘿𝙀𝙊' }, type: 1 }
  ];

  const caption = `
┈۪۪۪۪۪۪۪۪ٜ̈᷼─۪۪۪۪ٜ࣪᷼┈۪۪۪۪۪۪۪۪ٜ݊᷼⁔᮫ּׅ̫ׄ࣪︵᮫ּ๋ׅׅ۪۪۪۪ׅ࣪࣪͡⌒🌀𔗨⃪̤̤̤ٜ۫۫۫҈҈҈҈҉҉᷒ᰰ꤬۫۫۫𔗨̤̤̤𐇽─۪۪۪۪ٜ᷼┈۪۪۪۪۪۪۪۪ٜ̈᷼─۪۪۪۪ٜ࣪᷼┈۪۪۪۪݊᷼
₊‧꒰ 🦈 ꒱ 𝙀𝙇𝙇𝙀𝙉 𝙅𝙊𝙀 𝙎𝙀𝙍𝙑𝙄𝘾𝙀 — 𝘿𝘼𝙏𝙊𝙎 ✧˖°
︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶    ︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶    ︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶

> ૢ⃘꒰🍭⃝︩֟፝ *Título:* ${video.title}
> ૢ⃘꒰⏱️⃝︩֟፝ *Tiempo:* ${video.timestamp}
> ૢ⃘꒰👤⃝︩֟፝ *Canal:* ${video.author.name}

*— Elige rápido abajo. Mi hora de descanso es sagrada.*
⌣᮫ֶุ࣪ᷭ⌣〫᪲꒡᳝۪︶᮫໋࣭〭〫𝆬࣪࣪𝆬࣪꒡ֶ〪࣪ ׅ۫ெ᮫〪⃨〫〫᪲࣪˚̥ׅ੭ֶ֟ৎ᮫໋ׅ̣𝆬  ּ֢̊࣪⡠᮫ ໋🦈᮫ุ〪〪〫〫ᷭ ݄࣪⢄ꠋּ֢ ࣪ ֶׅ੭ֶ̣֟ৎ᮫˚̥࣪ெ᮫〪〪⃨〫᪲ ࣪꒡᮫໋〭࣪𝆬࣪︶〪᳝۪ꠋּ꒡ׅ⌣᮫ֶ࣪᪲⌣᮫ุ᳝〫֩ᷭ`;

  await conn.sendMessage(m.chat, {
    image: { url: video.thumbnail },
    caption,
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
