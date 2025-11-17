// Importa las librerías necesarias
import fetch from "node-fetch";
// Restauramos youtubedl/ogmp3 y las librerías locales necesarias para el respaldo Tier 3
import { ogmp3 } from '../lib/youtubedl.js';
// Asegúrate de que estas funciones existan en tu ../lib/ytscraper.js
import { ytmp3, ytmp4, get_id } from '../lib/ytscraper.js';  // ⬅️ ¡Añade get_id aquí! 
import yts from "yt-search";
import axios from 'axios';
import crypto from 'crypto';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Restauramos la clave de la API de respaldo Tier 2
const NEVI_API_KEY = 'ellen';

const SIZE_LIMIT_MB = 100;
const MIN_AUDIO_SIZE_BYTES = 50000;
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const name = conn.getName(m.sender);
  args = args.filter(v => v?.trim());

  // ContextInfo con la personalidad de Ellen Joe (¡Ahora Navideña!)
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
      body: `✦ 𝙀sperando 𝙩u 𝙡𝙞𝙨𝙩𝙖 𝙙𝙚 𝙙𝙚𝙨𝙚𝙤𝙨, ${name}. ¡No tardes, Santa no espera! 🎁`,
      thumbnail: icons, 
      sourceUrl: redes, 
      mediaType: 1,
      renderLargerThumbnail: false
    }
  };

  // Mensaje inicial de falta de argumento
  if (!args[0]) {
    return conn.reply(m.chat, `🦈 *¿᥎іᥒіs𝗍ᥱ ᥲ ⍴ᥱძіrmᥱ ᥲᥣg᥆ sіᥒ sᥲᑲᥱr 𝗊ᥙᥱ́?*
Necesito saber qué quieres en tu media navideña, ¡o te envío carbón!

🎧 ᥱȷᥱm⍴ᥣ᥆:
${usedPrefix}play *All I Want for Christmas Is You*`, m, { contextInfo });
  }

  const isMode = ["audio", "video"].includes(args[0].toLowerCase());
  const queryOrUrl = isMode ? args.slice(1).join(" ") : args.join(" ");
  
  let video;

  // Función reutilizada para enviar el archivo (Mensajes actualizados con tema navideño)
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
          caption: `🎁 *¡Vaya paquete!* (${fileSizeMb.toFixed(2)} MB). Es demasiado grande para el trineo, así que lo envío como documento. ¡Paciencia!
🖤 *Regalo:* ${title}`
        }, { quoted: m });
        await m.react("📄");
      } else {
        const mediaOptions = currentMode === 'audio'
          ? { audio: { url: downloadUrl }, mimetype: "audio/mpeg", fileName: `${title}.mp3` }
          : { video: { url: downloadUrl }, caption: `🎬 *Regalo Entregado.*
🖤 *Contenido:* ${title}`, fileName: `${title}.mp4`, mimetype: "video/mp4" };

        await conn.sendMessage(m.chat, mediaOptions, { quoted: m });
        await m.react(currentMode === 'audio' ? "🎧" : "📽️");
      }
    } catch (error) {
      console.error("Error al obtener el tamaño del archivo o al enviarlo:", error);
      throw new Error("No pude verificar el tamaño del envío. Tendré que intentarlo de nuevo.");
    }
  };


  // --- LÓGICA DE DESCARGA CON FALLBACKS (SILENCIOSOS) ---
  if (isMode && queryOrUrl) {
    const mode = args[0].toLowerCase();
    
    let scraperResult, finalDownloadUrl, finalTitle;

    await m.react(mode === 'audio' ? "🎧" : "📽️"); 
    
    // ------------------------------------
    // TIER 1: YTSCRAPER (PRIMARIO)
    // ------------------------------------
    try {
        const downloadFunction = mode === 'audio' ? ytmp3 : ytmp4;
        scraperResult = await downloadFunction(queryOrUrl);

        if (scraperResult?.status && scraperResult.download?.url) {
            finalDownloadUrl = scraperResult.download.url;
            finalTitle = scraperResult.metadata?.title || 'Título Desconocido';
            await sendMediaFile(finalDownloadUrl, finalTitle, mode);
            return; // Éxito
        }
        throw new Error(scraperResult?.download?.message || scraperResult?.message || "La API del scraper falló y no devolvió un enlace.");

    } catch (e1) {
        console.error("Error en Tier 1 (ytscraper):", e1.message);
        // Fallback silencioso a Tier 2
    }
    
    // ------------------------------------
    // TIER 2: NEVI API (RESPALDO 1) - Silencioso
    // ------------------------------------
    try {
        const neviApiUrl = `http://neviapi.ddns.net:5000/download`;
        const format = mode === "audio" ? "mp3" : "mp4";
        const res = await fetch(neviApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-KEY': NEVI_API_KEY },
            body: JSON.stringify({ url: queryOrUrl, format: format }),
        });

        const json = await res.json();
        
        if (json.status === "success" && json.download_link) {
            finalDownloadUrl = json.download_link;
            finalTitle = json.title || 'Título Desconocido';
            await sendMediaFile(finalDownloadUrl, finalTitle, mode);
            return; // Éxito
        }
        throw new Error(json.message || "NEVI API falló.");
        
    } catch (e2) {
        console.error("Error en Tier 2 (NEVI API):", e2.message);
        // Fallback silencioso a Tier 3
    }
    
    // ------------------------------------
    // TIER 3: OGMP3/YOUTUBEDL (RESPALDO 2/LOCAL) - Silencioso
    // ------------------------------------
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
                    caption: `🎁 *¡Vaya paquete!* (${fileSizeMb.toFixed(2)} MB). Es demasiado grande para el trineo, lo envío como documento. ¡Paciencia!
🖤 *Regalo:* ${downloadResult.result.title}`
                };
                await m.react("📄");
            } else {
                mediaOptions = mode === 'audio'
                    ? { audio: fileBuffer, mimetype: 'audio/mpeg', fileName: `${downloadResult.result.title}.mp3` }
                    : { video: fileBuffer, caption: `🎬 *Regalo Entregado.* 🖤 *Contenido:* ${downloadResult.result.title}`, fileName: `${downloadResult.result.title}.mp4`, mimetype: 'video/mp4' };
                await m.react(mode === 'audio' ? "🎧" : "📽️");
            }

            await conn.sendMessage(m.chat, mediaOptions, { quoted: m });
            fs.unlinkSync(tempFilePath);
            return; // Éxito
        }
        throw new Error("ogmp3 no pudo descargar el archivo.");

    } catch (e3) {
        console.error("Error en Tier 3 (ogmp3/youtubedl):", e3.message);
        
        // Limpiar archivo temporal si existe
        const tempFilePath = path.join(process.cwd(), './tmp', `${Date.now()}_${mode === 'audio' ? 'audio' : 'video'}.tmp`);
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        
        // Falla definitiva (único mensaje de error visible)
        await conn.reply(m.chat, `💔 *Fallé, pero tú más.*
Mi tiempo es oro y tu "regalo" resultó ser una mala inversión. ¡No pude entregarte nada! 🎄`, m);
        await m.react("❌");
    }
    return;
  }
  
  // ------------------------------------
  // Lógica de búsqueda o metadatos
  // ------------------------------------
  const videoId = get_id(queryOrUrl);

  if (videoId) {
    try {
      const searchResult = await yts({ videoId: videoId });
      video = searchResult.videos?.[0];
    } catch (e) {
      console.error("Error al obtener info de la URL con ID:", e);
      return conn.reply(m.chat, `💔 *Fallé al procesar tu capricho.* La URL es válida, pero la información del video está tan muerta como el espíritu navideño de un Grinch.`, m, { contextInfo });
    }
  } else if (queryOrUrl && /^(https?:\/\/)/i.test(queryOrUrl)) { 
     return conn.reply(m.chat, `💔 *Fallé al procesar tu capricho.* Esa URL parece basura; no es un video de YouTube. ¡Concéntrate en la lista de deseos real!`, m, { contextInfo });
  } else {
    try {
      const searchResult = await yts(queryOrUrl);
      video = searchResult.videos?.[0];
    } catch (e) {
      console.error("Error durante la búsqueda en Youtube:", e);
      return conn.reply(m.chat, `🖤 *Qué patético...*
Tu "lista de deseos" no arrojó resultados. ¿Eres tan malo buscando regalos?`, m, { contextInfo });
    }
  }


  if (!video) {
    return conn.reply(m.chat, `🦈 *Esta cosa murió antes de empezar.*
Nada encontrado con "${queryOrUrl}". ¿Seguro que existe o es solo un sueño navideño tonto?`, m, { contextInfo });
  }
  
  // Botones
  const buttons = [
    { buttonId: `${usedPrefix}play audio ${video.url}`, buttonText: { displayText: '🎧 𝘼𝙐𝘿𝙄𝙊 (Villancico Ligero)' }, type: 1 },
    { buttonId: `${usedPrefix}play video ${video.url}`, buttonText: { displayText: '🎬 𝙑𝙄𝘿𝙀𝙊 (Gran Regalo)' }, type: 1 }
  ];

  // Mensaje de metadatos (Ellen Joe: Descriptiva de la mercancía Navideña)
  const caption = `
┈۪۪۪۪۪۪۪۪ٜ̈᷼─۪۪۪۪ٜ࣪᷼┈۪۪۪۪۪۪۪۪ٜ݊᷼⁔᮫ּׅ̫ׄ࣪︵᮫ּ๋ׅׅ۪۪۪۪ׅ࣪࣪͡⌒🌀𔗨⃪̤̤̤ٜ۫۫۫҈҈҈҈҉҉᷒ᰰ꤬۫۫۫𔗨̤̤̤𐇽─۪۪۪۪ٜ᷼┈۪۪۪۪۪۪۪۪ٜ̈᷼─۪۪۪۪ٜ࣪᷼┈۪۪۪۪݊᷼
₊‧꒰ 🎄꒱ 𝙀𝙇𝙇𝙀𝙉 𝙅𝙊𝙀 𝘽𝙊𝙏 — 𝙇𝙄𝙎𝙏𝘼 𝘿𝙀 𝘿𝙀𝙎𝙀𝙊𝙎 ✧˖°
︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶   ︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶   ︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶

> ૢ⃘꒰🎁⃝︩֟፝𐴲ⳋᩧ᪲ *Título (El Deseo):* ${video.title}
> ૢ⃘꒰⏱️⃝︩֟፝𐴲ⳋᩧ᪲ *Duración (Tiempo de Disfrute):* ${video.timestamp}
> ૢ⃘꒰👀⃝︩֟፝𐴲ⳋᩧ᪲ *Vistas (Popularidad Navideña):* ${video.views.toLocaleString()}
> ૢ⃘꒰👤⃝︩֟፝𐴲ⳋᩧ᪲ *Subido por (El Fabricante):* ${video.author.name}
> ૢ⃘꒰📅⃝︩֟፝𐴲ⳋᩧ᪲ *Hace (Antigüedad):* ${video.ago}
> ૢ⃘꒰🔗⃝︩֟፝𐴲ⳋᩧ᪲ *URL (Ubicación del Regalo):* ${video.url}
⌣᮫ֶุ࣪ᷭ⌣〫᪲꒡᳝۪︶᮫໋࣭〭〫𝆬࣪࣪𝆬࣪꒡ֶ〪࣪ ׅ۫ெ᮫〪⃨〫〫᪲࣪˚̥ׅ੭ֶ֟ৎ᮫໋ׅ̣𝆬  ּ֢̊࣪⡠᮫ ໋🦈᮫ุ〪〪〫〫ᷭ ݄࣪⢄ꠋּ֢ ࣪ ֶׅ੭ֶ̣֟ৎ᮫˚̥࣪ெ᮫〪〪⃨〫᪲ ࣪꒡᮫໋〭࣪𝆬࣪︶〪᳝۪ꠋּ꒡ׅ⌣᮫ֶ࣪᪲⌣᮫ุ᳝〫֩ᷭ
     ᷼͝ ᮫໋⏝᮫໋〪ׅ〫𝆬⌣ׄ𝆬᷼᷼᷼᷼᷼᷼᷼᷼᷼⌣᷑︶᮫᷼͡︶ׅ ໋𝆬⋰᩠〫 ᮫ׄ ׅ𝆬 ⠸᮫ׄ ׅ ⋱〫 ۪۪ׄ᷑𝆬︶᮫໋᷼͡︶ׅ 𝆬⌣᮫〫ׄ᷑᷼᷼᷼᷼᷼᷼᷼᷼᷼⌣᜔᮫ׄ⏝᜔᮫๋໋〪ׅ〫 ᷼͝`;

  await conn.sendMessage(m.chat, {
    image: { url: video.thumbnail },
    caption,
    footer: 'Dime cómo quieres tu regalo: ¿Audio o Video? No me pidas la bufanda si quieres el trineo. ┐(￣ー￣)┌.',
    buttons,
    headerType: 4,
    contextInfo
  }, { quoted: m });
};

handler.help = ['play'].map(v => v + ' <búsqueda o URL>');
handler.tags = ['descargas'];
handler.command = ['play'];
handler.register = true;
handler.prefix = /^[./#]/;

export default handler;
