// Importa las librerías necesarias
import fetch from "node-fetch";

// --- CAMBIO CLAVE: Importamos las funciones de nuestro scraper ---
// ASUMIMOS que ../lib/ytscraper.js ahora exporta ytmp3, ytmp4 y get_id
import { ytmp3, ytmp4, get_id } from '../lib/ytscraper.js'; 

// Importa el módulo de respaldo (Mantenemos youtubedl si ogmp3 lo necesita)
import { ogmp3 } from '../lib/youtubedl.js'; 

import yts from "yt-search";
import axios from 'axios';
import crypto from 'crypto';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Reemplaza 'TU_CLAVE_API' con tu clave real.
const NEVI_API_KEY = 'ellen';

const SIZE_LIMIT_MB = 100;
const MIN_AUDIO_SIZE_BYTES = 50000;
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
      title: '🖤 ⏤͟͟͞͞𝙀𝙇𝙇𝙀𝙉 - 𝘽𝙊𝙏 ᨶ႒ᩚ',
      body: `✦ 𝙀sperando 𝙩u s𝙤𝙡𝙞𝙘𝙞𝙩u𝙙, ${name}. ♡~٩( ˃▽˂ )۶~♡`,
      thumbnail: icons, 
      sourceUrl: redes, 
      mediaType: 1,
      renderLargerThumbnail: false
    }
  };

  if (!args[0]) {
    return conn.reply(m.chat, `🦈 *¿᥎іᥒіs𝗍ᥱ ᥲ ⍴ᥱძіrmᥱ ᥲᥣg᥆ sіᥒ sᥲᑲᥱr 𝗊ᥙᥱ́?*
ძі ᥣ᥆ 𝗊ᥙᥱ 𝗊ᥙіᥱrᥱs... ᥆ ᥎ᥱ𝗍ᥱ.

🎧 ᥱȷᥱm⍴ᥣ᥆:
${usedPrefix}play moonlight - kali uchis`, m, { contextInfo });
  }

  const isMode = ["audio", "video"].includes(args[0].toLowerCase());
  const queryOrUrl = isMode ? args.slice(1).join(" ") : args.join(" ");
  
  let video;

  // Función reutilizada para enviar el archivo
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
          caption: `⚠️ *El archivo es muy grande (${fileSizeMb.toFixed(2)} MB), así que lo envío como documento. Puede tardar más en descargar.*
🖤 *Título:* ${title}`
        }, { quoted: m });
        await m.react("📄");
      } else {
        const mediaOptions = currentMode === 'audio'
          ? { audio: { url: downloadUrl }, mimetype: "audio/mpeg", fileName: `${title}.mp3` }
          : { video: { url: downloadUrl }, caption: `🎬 *Listo.*
🖤 *Título:* ${title}`, fileName: `${title}.mp4`, mimetype: "video/mp4" };

        await conn.sendMessage(m.chat, mediaOptions, { quoted: m });
        await m.react(currentMode === 'audio' ? "🎧" : "📽️");
      }
    } catch (error) {
      console.error("Error al obtener el tamaño del archivo o al enviarlo:", error);
      throw new Error("No se pudo obtener el tamaño del archivo o falló el envío. Se intentará de nuevo.");
    }
  };


  // --- LÓGICA DE DESCARGA CON FALLBACKS (si se especifica el modo y el enlace) ---
  if (isMode && queryOrUrl) {
    const mode = args[0].toLowerCase();
    
    let scraperResult, finalDownloadUrl, finalTitle;
    let fallbackToNevi = false;

    // ------------------------------------
    // TIER 1: YTSCRAPER (PRIMARIO)
    // ------------------------------------
    // [✅ CAMBIO SOLICITADO] Mensaje genérico para el primer intento.
    await conn.reply(m.chat, `⏳ *Dame un momento, estoy procesando el archivo a ${mode.toUpperCase()}...* (Método 1/3)`, m);
    await m.react("🔃");
    
    try {
        const downloadFunction = mode === 'audio' ? ytmp3 : ytmp4;
        scraperResult = await downloadFunction(queryOrUrl);

        if (scraperResult && scraperResult.status && scraperResult.download && scraperResult.download.url) {
            finalDownloadUrl = scraperResult.download.url;
            finalTitle = scraperResult.metadata?.title || 'Título Desconocido';
            
            // Éxito en Tier 1
            await sendMediaFile(finalDownloadUrl, finalTitle, mode);
            return;
        }
        throw new Error(scraperResult.download?.message || scraperResult.message || "La API del scraper falló y no devolvió un enlace.");

    } catch (e1) {
        console.error("Error en Tier 1 (ytscraper):", e1.message);
        fallbackToNevi = true;
    }
    
    // ------------------------------------
    // TIER 2: NEVI API (RESPALDO 1)
    // ------------------------------------
    if (fallbackToNevi) {
        await conn.reply(m.chat, `💔 *Fallé al procesar con el primer método.*
Intentando con el método de respaldo. (Método 2/3)`, m);
        await m.react("🔄");

        try {
            const neviApiUrl = `http://neviapi.ddns.net:5000/download`;
            const format = mode === "audio" ? "mp3" : "mp4";
            const res = await fetch(neviApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': NEVI_API_KEY,
                },
                body: JSON.stringify({
                    url: queryOrUrl,
                    format: format
                }),
            });

            const json = await res.json();
            
            if (json.status === "success" && json.download_link) {
                finalDownloadUrl = json.download_link;
                finalTitle = json.title || 'Título Desconocido';
                
                // Éxito en Tier 2
                await sendMediaFile(finalDownloadUrl, finalTitle, mode);
                return;
            }
            throw new Error(json.message || "NEVI API falló.");
            
        } catch (e2) {
            console.error("Error en Tier 2 (NEVI API):", e2.message);
            
            // ------------------------------------
            // TIER 3: OGMP3/YOUTUBEDL (RESPALDO 2/LOCAL)
            // ------------------------------------
            await conn.reply(m.chat, `💔 *El segundo método también falló.*
Intentando con la descarga directa local (Último recurso). (Método 3/3)`, m);
            await m.react("⬇️");

            try {
                const tempFilePath = path.join(process.cwd(), './tmp', `${Date.now()}_${mode === 'audio' ? 'audio' : 'video'}.tmp`);
                
                const downloadResult = await ogmp3.download(queryOrUrl, tempFilePath, mode);
                
                if (downloadResult.status && fs.existsSync(tempFilePath)) {
                    const stats = fs.statSync(tempFilePath);
                    const fileSizeMb = stats.size / (1024 * 1024);
                    
                    let mediaOptions;
                    const fileBuffer = fs.readFileSync(tempFilePath);

                    if (fileSizeMb > SIZE_LIMIT_MB) {
                        mediaOptions = {
                            document: fileBuffer,
                            fileName: `${downloadResult.result.title}.${mode === 'audio' ? 'mp3' : 'mp4'}`,
                            mimetype: mode === 'audio' ? 'audio/mpeg' : 'video/mp4',
                            caption: `⚠️ *El archivo es muy grande (${fileSizeMb.toFixed(2)} MB), lo envío como documento. Puede tardar más en descargar.*
🖤 *Título:* ${downloadResult.result.title}`
                        };
                        await m.react("📄");
                    } else {
                        mediaOptions = mode === 'audio'
                            ? { audio: fileBuffer, mimetype: 'audio/mpeg', fileName: `${downloadResult.result.title}.mp3` }
                            : { video: fileBuffer, caption: `🎬 *Listo.* 🖤 *Título:* ${downloadResult.result.title}`, fileName: `${downloadResult.result.title}.mp4`, mimetype: 'video/mp4' };
                        await m.react(mode === 'audio' ? "🎧" : "📽️");
                    }

                    await conn.sendMessage(m.chat, mediaOptions, { quoted: m });
                    fs.unlinkSync(tempFilePath);
                    return;
                }
                throw new Error("ogmp3 no pudo descargar el archivo.");

            } catch (e3) {
                console.error("Error en Tier 3 (ogmp3/youtubedl):", e3.message);
                
                const tempFilePath = path.join(process.cwd(), './tmp', `${Date.now()}_${mode === 'audio' ? 'audio' : 'video'}.tmp`);
                if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
                
                // Falla definitiva
                await conn.reply(m.chat, `💔 *fallé. pero tú más.*
no pude traerte nada.`, m);
                await m.react("❌");
            }
        }
    }
    return;
  }
  
  // ------------------------------------
  // Lógica de búsqueda o metadatos
  // ------------------------------------
  // Uso la función get_id del scraper para extraer el ID de la URL
  const videoId = get_id(queryOrUrl);

  if (videoId) {
    try {
      // Búsqueda por ID usando yts
      const searchResult = await yts({ videoId: videoId });
      video = searchResult.videos?.[0];
    } catch (e) {
      console.error("Error al obtener info de la URL con ID:", e);
      return conn.reply(m.chat, `💔 *Fallé al procesar tu capricho.* La URL es válida, pero no pude obtener la información del video.`, m, { contextInfo });
    }
  } else if (queryOrUrl && /^(https?:\/\/)/i.test(queryOrUrl)) { 
     // Si parece un link pero get_id falló
     return conn.reply(m.chat, `💔 *Fallé al procesar tu capricho.* Esa URL parece un enlace, pero no es un video de YouTube válido.`, m, { contextInfo });
  } else {
    try {
      // Búsqueda por query de texto
      const searchResult = await yts(queryOrUrl);
      video = searchResult.videos?.[0];
    } catch (e) {
      console.error("Error durante la búsqueda en Youtube:", e);
      return conn.reply(m.chat, `🖤 *qué patético...*
no logré encontrar nada con lo que pediste`, m, { contextInfo });
    }
  }


  if (!video) {
    return conn.reply(m.chat, `🦈 *esta cosa murió antes de empezar.*
nada encontrado con "${queryOrUrl}"`, m, { contextInfo });
  }
  
  const buttons = [
    { buttonId: `${usedPrefix}play audio ${video.url}`, buttonText: { displayText: '🎧 𝘼𝙐𝘿𝙄𝙊' }, type: 1 },
    { buttonId: `${usedPrefix}play video ${video.url}`, buttonText: { displayText: '🎬 𝙑𝙄𝘿𝙀𝙊' }, type: 1 }
  ];

  const caption = `
┈۪۪۪۪۪۪۪۪ٜ̈᷼─۪۪۪۪ٜ࣪᷼┈۪۪۪۪۪۪۪۪ٜ݊᷼⁔᮫ּׅ̫ׄ࣪︵᮫ּ๋ׅׅ۪۪۪۪ׅ࣪࣪͡⌒🌀𔗨⃪̤̤̤ٜ۫۫۫҈҈҈҈҉҉᷒ᰰ꤬۫۫۫𔗨̤̤̤𐇽─۪۪۪۪ٜ᷼┈۪۪۪۪۪۪۪۪ٜ̈᷼─۪۪۪۪ٜ࣪᷼┈۪۪۪۪݊᷼
₊‧꒰ 🎧꒱ 𝙀𝙇𝙇𝙀𝙉 𝙅𝙊𝙀 𝘽𝙊𝙏 — 𝙋𝙇𝘼𝙔 𝙈𝙊𝘿𝙀 ✧˖°
︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶   ︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶   ︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶

> ૢ⃘꒰🎧⃝︩֟፝𐴲ⳋᩧ᪲ *Título:* ${video.title}
> ૢ⃘꒰⏱️⃝︩֟፝𐴲ⳋᩧ᪲ *Duración:* ${video.timestamp}
> ૢ⃘꒰👀⃝︩֟፝𐴲ⳋᩧ᪲ *Vistas:* ${video.views.toLocaleString()}
> ૢ⃘꒰👤⃝︩֟፝𐴲ⳋᩧ᪲ *Subido por:* ${video.author.name}
> ૢ⃘꒰📅⃝︩֟፝𐴲ⳋᩧ᪲ *Hace:* ${video.ago}
> ૢ⃘꒰🔗⃝︩֟፝𐴲ⳋᩧ᪲ *URL:* ${video.url}
⌣᮫ֶุ࣪ᷭ⌣〫᪲꒡᳝۪︶᮫໋࣭〭〫𝆬࣪࣪𝆬࣪꒡ֶ〪࣪ ׅ۫ெ᮫〪⃨〫〫᪲࣪˚̥ׅ੭ֶ֟ৎ᮫໋ׅ̣𝆬  ּ֢̊࣪⡠᮫ ໋🦈᮫ุ〪〪〫〫ᷭ ݄࣪⢄ꠋּ֢ ࣪ ֶׅ੭ֶ̣֟ৎ᮫˚̥࣪ெ᮫〪〪⃨〫᪲ ࣪꒡᮫໋〭࣪𝆬࣪︶〪᳝۪ꠋּ꒡ׅ⌣᮫ֶ࣪᪲⌣᮫ุ᳝〫֩ᷭ
     ᷼͝ ᮫໋⏝᮫໋〪ׅ〫𝆬⌣ׄ𝆬᷼᷼᷼᷼᷼᷼᷼᷼᷼⌣᷑︶᮫᷼͡︶ׅ ໋𝆬⋰᩠〫 ᮫ׄ ׅ𝆬 ⠸᮫ׄ ׅ ⋱〫 ۪۪ׄ᷑𝆬︶᮫໋᷼͡︶ׅ 𝆬⌣᮫〫ׄ᷑᷼᷼᷼᷼᷼᷼᷼᷼᷼⌣᜔᮫ׄ⏝᜔᮫๋໋〪ׅ〫 ᷼͝`;

  await conn.sendMessage(m.chat, {
    image: { url: video.thumbnail },
    caption,
    footer: 'Dime cómo lo quieres... o no digas nada ┐(￣ー￣)┌.',
    buttons,
    headerType: 4,
    contextInfo
  }, { quoted: m });
};

handler.help = ['prueba'].map(v => v + ' <búsqueda o URL>');
handler.tags = ['descargas'];
handler.command = ['prueba'];
handler.register = true;
handler.prefix = /^[./#]/;

export default handler;
