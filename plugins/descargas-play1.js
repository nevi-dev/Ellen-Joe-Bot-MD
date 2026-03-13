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
      title: '🦈 𝙑𝙄𝘾𝙏𝙊𝙍𝙄𝘼 𝙃𝙊𝙐𝙎𝙀𝙆𝙀𝙀𝙋𝙄𝙉𝙂',
      body: `— Suspiro... ¿Qué quieres ahora, ${name}?`,
      thumbnail: icons, 
      sourceUrl: redes,
      mediaType: 1,
      renderLargerThumbnail: false
    }
  };

  if (!args[0]) {
    return conn.reply(m.chat, `*— (Bostezo)*... ¿Viniste a pedirme algo sin siquiera saber qué?\n\n🎧 ᥱȷᥱm⍴ᥣ᥆:\n${usedPrefix}play *Linger*`, m, { contextInfo });
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
        
        // Búsqueda rápida para obtener el nombre del canal (uploader)
        const search = await yts(query);
        const uploader = search.videos?.[0]?.author?.name;
        const albumName = "Ellen Joe Service";

        const fileName = `${Date.now()}`;
        const inputPath = path.join(tmpDir, `${fileName}_input`);
        const outputPath = path.join(tmpDir, `${fileName}.${type === 'audio' ? 'mp3' : 'mp4'}`);

        // Descarga directa (Stream)
        const fileRes = await axios({ url: downloadUrl, method: 'GET', responseType: 'stream' });
        const writer = fs.createWriteStream(inputPath);
        fileRes.data.pipe(writer);
        await new Promise((resolve) => writer.on('finish', resolve));

        if (type === 'audio') {
          // Comando FFmpeg ultra rápido: Solo texto, sin procesar imagen
          await execPromise(`ffmpeg -i "${inputPath}" -c copy -metadata title="${title}" -metadata artist="${uploader} // ${albumName}" -metadata album="${albumName}" "${outputPath}"`);

          await conn.sendMessage(m.chat, { 
            audio: fs.readFileSync(outputPath), 
            mimetype: "audio/mpeg", 
            fileName: `${title}.mp3` 
          }, { quoted: m });
          
        } else {
          // Envío de video
          await conn.sendMessage(m.chat, { 
            video: { url: downloadUrl }, 
            caption: `🎬 *Aquí tienes.*\n\n> *Contenido:* ${title}\n> *Uploader:* ${uploader}`, 
            mimetype: "video/mp4" 
          }, { quoted: m });
        }

        // Limpieza rápida
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

        await m.react("✅");
      }
    } catch (error) {
      console.error(error);
      await m.react("❌");
      return conn.reply(m.chat, `*— Tsk...* Falló el servicio.`, m);
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
      { buttonId: `${usedPrefix}play video ${video.url}`, buttonText: { displayText: '🎬 𝙑𝙄𝘿𝙀𝙊' }, type: 1 }
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
