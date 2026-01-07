// Importa las librerías necesarias
import fetch from "node-fetch";
import { ogmp3 } from '../lib/youtubedl.js';
import { ytmp3, ytmp4, get_id } from '../lib/ytscraper.js'; 
import yts from "yt-search";
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const NEVI_API_KEY = 'ellen';
const SIZE_LIMIT_MB = 100;
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const name = conn.getName(m.sender);
  args = args.filter(v => v?.trim());

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
      title: '🦈 𝙑𝙄𝘾𝙏𝙊𝙍𝙄𝘼 𝙃𝙊𝙐𝙎𝙀𝙆𝙀𝙀𝙋𝙄𝙉𝙂',
      body: `— Suspiro... ¿Qué quieres ahora, ${name}? Date prisa.`,
      thumbnail: icons, 
      sourceUrl: redes, 
      mediaType: 1,
      renderLargerThumbnail: false
    }
  };

  if (!args[0]) {
    return conn.reply(m.chat, `*— (Bostezo)*... ¿Viniste a pedirme algo sin siquiera saber qué? No soy adivina.

🎧 ᥱȷᥱm⍴ᥣ᥆:
${usedPrefix}play *Linger - The Cranberries*`, m, { contextInfo });
  }

  const isMode = ["audio", "video"].includes(args[0].toLowerCase());
  const queryOrUrl = isMode ? args.slice(1).join(" ") : args.join(" ");
  
  let video;

  const sendMediaFile = async (downloadUrl, title, currentMode) => {
    try {
      await m.react("📥");
      const response = await axios.head(downloadUrl);
      const contentLength = response.headers['content-length'];
      const fileSizeMb = contentLength / (1024 * 1024);

      if (fileSizeMb > SIZE_LIMIT_MB) {
        await conn.sendMessage(m.chat, {
          document: { url: downloadUrl },
          fileName: `${title}.${currentMode === 'audio' ? 'mp3' : 'mp4'}`,
          mimetype: currentMode === 'audio' ? 'audio/mpeg' : 'video/mp4',
          caption: `*— Ugh, qué pesado.* (${fileSizeMb.toFixed(2)} MB). Tu archivo es demasiado grande para enviarlo normal, así que te lo mando como documento. No te quejes.\n\n🦈 *Archivo:* ${title}`
        }, { quoted: m });
        await m.react("📄");
      } else {
        const mediaOptions = currentMode === 'audio'
          ? { audio: { url: downloadUrl }, mimetype: "audio/mpeg", fileName: `${title}.mp3` }
          : { video: { url: downloadUrl }, caption: `🎬 *Aquí tienes.* No me pidas nada más en un rato.\n🦈 *Contenido:* ${title}`, fileName: `${title}.mp4`, mimetype: "video/mp4" };

        await conn.sendMessage(m.chat, mediaOptions, { quoted: m });
        await m.react(currentMode === 'audio' ? "🎧" : "📽️");
      }
    } catch (error) {
      console.error("Error al enviar:", error);
      throw new Error("Algo salió mal. Qué molesto...");
    }
  };

  if (isMode && queryOrUrl) {
    const mode = args[0].toLowerCase();
    await m.react(mode === 'audio' ? "🎧" : "📽️"); 
    
    // TIER 1
    try {
        const downloadFunction = mode === 'audio' ? ytmp3 : ytmp4;
        let scraperResult = await downloadFunction(queryOrUrl);
        if (scraperResult?.status && scraperResult.download?.url) {
            await sendMediaFile(scraperResult.download.url, scraperResult.metadata?.title || 'Audio/Video', mode);
            return;
        }
    } catch (e1) { console.error("Tier 1 fail"); }
    
    // TIER 2
    try {
        const res = await fetch(`http://neviapi.ddns.net:5000/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-KEY': NEVI_API_KEY },
            body: JSON.stringify({ url: queryOrUrl, format: mode === "audio" ? "mp3" : "mp4" }),
        });
        const json = await res.json();
        if (json.status === "success" && json.download_link) {
            await sendMediaFile(json.download_link, json.title, mode);
            return;
        }
    } catch (e2) { console.error("Tier 2 fail"); }
    
    // TIER 3
    try {
        const tempFilePath = path.join(process.cwd(), './tmp', `${Date.now()}_${mode}.tmp`);
        const downloadResult = await ogmp3.download(queryOrUrl, tempFilePath, mode);
        if (downloadResult.status && fs.existsSync(tempFilePath)) {
            const fileBuffer = fs.readFileSync(tempFilePath);
            await conn.sendMessage(m.chat, mode === 'audio' 
                ? { audio: fileBuffer, mimetype: 'audio/mpeg', fileName: `${downloadResult.result.title}.mp3` }
                : { video: fileBuffer, caption: `🎬 *Aquí está tu video.* \n🦈 *Título:* ${downloadResult.result.title}`, mimetype: 'video/mp4' }, { quoted: m });
            fs.unlinkSync(tempFilePath);
            return;
        }
    } catch (e3) {
        await conn.reply(m.chat, `*— Tsk, olvídalo.*\nIntenté descargarlo pero el sistema dio error. Qué pérdida de tiempo.`, m);
        await m.react("❌");
    }
    return;
  }
  
  const videoId = get_id(queryOrUrl);
  if (videoId) {
    try {
      const searchResult = await yts({ videoId: videoId });
      video = searchResult.videos?.[0];
    } catch (e) {
      return conn.reply(m.chat, `*— Suspiro...* La URL es válida, pero no puedo obtener la info. Qué molesto.`, m, { contextInfo });
    }
  } else if (queryOrUrl && /^(https?:\/\/)/i.test(queryOrUrl)) { 
     return conn.reply(m.chat, `*— ¿En serio?* Eso ni siquiera es un link de YouTube. No me hagas trabajar de más.`, m, { contextInfo });
  } else {
    try {
      const searchResult = await yts(queryOrUrl);
      video = searchResult.videos?.[0];
    } catch (e) {
      return conn.reply(m.chat, `*— Qué patético...* No encontré nada. ¿Seguro que sabes escribir?`, m, { contextInfo });
    }
  }

  if (!video) return conn.reply(m.chat, `*— (Masticando caramelos)*... No hay nada. Busca otra cosa.`, m, { contextInfo });
  
  const buttons = [
    { buttonId: `${usedPrefix}play audio ${video.url}`, buttonText: { displayText: '🎧 𝘼𝙐𝘿𝙄𝙊' }, type: 1 },
    { buttonId: `${usedPrefix}play video ${video.url}`, buttonText: { displayText: '🎬 𝙑𝙄𝘿𝙀𝙊' }, type: 1 }
  ];

  const caption = `
┈۪۪۪۪۪۪۪۪ٜ̈᷼─۪۪۪۪ٜ࣪᷼┈۪۪۪۪۪۪۪۪ٜ݊᷼⁔᮫ּׅ̫ׄ࣪︵᮫ּ๋ׅׅ۪۪۪۪ׅ࣪࣪͡⌒🌀𔗨⃪̤̤̤ٜ۫۫۫҈҈҈҈҉҉᷒ᰰ꤬۫۫۫𔗨̤̤̤𐇽─۪۪۪۪ٜ᷼┈۪۪۪۪۪۪۪۪ٜ̈᷼─۪۪۪۪ٜ࣪᷼┈۪۪۪۪݊᷼
₊‧꒰ 🦈 ꒱ 𝙀𝙇𝙇𝙀𝙉 𝙅𝙊𝙀 𝙎𝙀𝙍𝙑𝙄𝘾𝙀 — 𝘿𝘼𝙏𝙊𝙎 ✧˖°
︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶   ︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶   ︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶

> ૢ⃘꒰🍭⃝︩֟፝ *Título:* ${video.title}
> ૢ⃘꒰⏱️⃝︩֟፝ *Tiempo:* ${video.timestamp}
> ૢ⃘꒰👀⃝︩֟፝ *Vistas:* ${video.views.toLocaleString()}
> ૢ⃘꒰👤⃝︩֟፝ *Canal:* ${video.author.name}
> ૢ⃘꒰🔗⃝︩֟፝ *Enlace:* ${video.url}

*— Elige rápido. Se me acaba la paciencia y mi hora de descanso es sagrada.*
⌣᮫ֶุ࣪ᷭ⌣〫᪲꒡᳝۪︶᮫໋࣭〭〫𝆬࣪࣪𝆬࣪꒡ֶ〪࣪ ׅ۫ெ᮫〪⃨〫〫᪲࣪˚̥ׅ੭ֶ֟ৎ᮫໋ׅ̣𝆬  ּ֢̊࣪⡠᮫ ໋🦈᮫ุ〪〪〫〫ᷭ ݄࣪⢄ꠋּ֢ ࣪ ֶׅ੭ֶ̣֟ৎ᮫˚̥࣪ெ᮫〪〪⃨〫᪲ ࣪꒡᮫໋〭࣪𝆬࣪︶〪᳝۪ꠋּ꒡ׅ⌣᮫ֶ࣪᪲⌣᮫ุ᳝〫֩ᷭ`;

  await conn.sendMessage(m.chat, {
    image: { url: video.thumbnail },
    caption,
    footer: 'Victoria Housekeeping Service',
    buttons,
    headerType: 4,
    contextInfo
  }, { quoted: m });
};

handler.help = ['play'].map(v => v + ' <búsqueda>');
handler.tags = ['descargas'];
handler.command = ['play'];
handler.register = true;

export default handler;
