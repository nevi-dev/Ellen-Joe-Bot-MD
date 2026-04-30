import { exec } from 'child_process';
import fs from 'fs';
import axios from 'axios';
import yts from "yt-search";
import { promisify } from 'util';
import path from 'path';

const execPromise = promisify(exec);
const API_BASE = 'https://rest.apicausas.xyz/api/v1/descargas/youtube';
const API_KEY = 'causa-ee5ee31dcfc79da4';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const name = conn.getName(m.sender);
  const tmpDir = './tmp';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  args = args.filter(v => v?.trim());

  const contextInfo = {
    mentionedJid: [m.sender],
    isForwarded: true,
    forwardingScore: 999,
    externalAdReply: {
      title: '🦈 𝙑𝙄𝘾𝙏𝙊𝙍𝙄𝘼 𝙃𝙊𝙐𝙎Ｅ𝙆ＥＥ𝙋ＩＮ𝙂',
      body: `— Suspiro... ¿Qué quieres ahora, ${name}?`,
      thumbnail: global.icons, 
      sourceUrl: global.redes,
      mediaType: 1,
      renderLargerThumbnail: false
    }
  };

  if (!args[0]) {
    return conn.reply(m.chat, `*— (Bostezo)*... ¿Qué vas a pedir?\n\n🎧 ᥱȷᥱm⍴ᥣ᥆:\n${usedPrefix}play *Linger*`, m, { contextInfo });
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
        const search = await yts(query);
        const video = search.videos?.[0];
        const uploader = video?.author?.name || "Victoria Housekeeping";
        const thumbUrl = video?.thumbnail;

        const fileName = `${Date.now()}`;
        const inputPath = path.join(tmpDir, `${fileName}_in`);
        const thumbPath = path.join(tmpDir, `${fileName}_thumb.jpg`);
        const outputPath = path.join(tmpDir, `${fileName}.${type === 'audio' ? 'm4a' : 'mp4'}`);

        // Descarga de archivos
        const [fileRes, thumbRes] = await Promise.all([
          axios({ url: downloadUrl, method: 'GET', responseType: 'stream' }),
          axios({ url: thumbUrl, method: 'GET', responseType: 'stream' }).catch(() => null)
        ]);

        const writer = fs.createWriteStream(inputPath);
        fileRes.data.pipe(writer);
        await new Promise(res => writer.on('finish', res));

        if (thumbRes) {
            const thumbWriter = fs.createWriteStream(thumbPath);
            thumbRes.data.pipe(thumbWriter);
            await new Promise(res => thumbWriter.on('finish', res));
        }

        if (type === 'audio') {
          // Comando robusto: Re-codificamos a AAC (muy rápido) para asegurar que pegue la imagen y los metadatos sin errores
          let ffmpegCmd = `ffmpeg -i "${inputPath}" `;
          if (fs.existsSync(thumbPath)) {
            ffmpegCmd += `-i "${thumbPath}" -map 0:0 -map 1:0 -c:a aac -b:a 128k -disposition:v:0 attached_pic `;
          } else {
            ffmpegCmd += `-c:a aac -b:a 128k `;
          }
          ffmpegCmd += `-metadata title="${title}" -metadata artist="${uploader}" -metadata album="Ellen Joe Service" -movflags +faststart "${outputPath}"`;

          await execPromise(ffmpegCmd);

          await conn.sendMessage(m.chat, { 
            audio: fs.readFileSync(outputPath), 
            mimetype: 'audio/mp4', 
            fileName: `${title}.m4a`,
            ptt: false 
          }, { quoted: m });
          
        } else {
          await conn.sendMessage(m.chat, { 
            video: { url: downloadUrl }, 
            caption: `🎬 *Aquí tienes.*\n\n> *Contenido:* ${title}\n> *Uploader:* ${uploader}`, 
            mimetype: "video/mp4" 
          }, { quoted: m });
        }

        // Limpieza de archivos
        [inputPath, thumbPath, outputPath].forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
        await m.react("✅");

      }
    } catch (error) {
      console.error("Error en Handler:", error);
      await m.react("❌");
      return conn.reply(m.chat, `*— Tsk...* Algo salió mal internamente.`, m);
    }
    return;
  }

  // --- BÚSQUEDA ---
  await m.react("🔍");
  const searchResult = await yts(query);
  const video = searchResult.videos?.[0];
  if (!video) return conn.reply(m.chat, `*— No encontré nada.*`, m);

  const caption = `₊‧꒰ 🦈 ꒱ 𝙀𝙇𝙇𝙀𝙉 𝙅𝙊𝙀 𝙎𝙀𝙍𝙑𝙄𝘾𝙀\n\n> *Título:* ${video.title}\n> *Uploader:* ${video.author.name}\n> *Duración:* ${video.timestamp}\n\n*— Elige si quieres audio o video.*`;

  await conn.sendMessage(m.chat, {
    image: { url: video.thumbnail },
    caption,
    footer: 'Victoria Housekeeping Service',
    buttons: [
      { buttonId: `${usedPrefix}play audio ${video.url}`, buttonText: { displayText: '🎧 𝘼𝙐𝘿𝙄𝙊' }, type: 1 },
      { buttonId: `${usedPrefix}play video ${video.url}`, buttonText: { displayText: '🎬 𝙑Ｉ𝘿Ｅ𝙊' }, type: 1 }
    ],
    headerType: 4,
    contextInfo
  }, { quoted: m });
};

handler.help = ['play <búsqueda>'];
handler.tags = ['descargas'];
handler.command = ['play'];
handler.register = true;

export default handler;
