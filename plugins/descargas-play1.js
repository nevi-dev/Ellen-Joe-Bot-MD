import axios from 'axios';
import yts from "yt-search";
import fetch from 'node-fetch';

const API_BASE = 'https://rest.apicausas.xyz/api/v1/descargas/youtube';
const API_KEY = 'causa-ee5ee31dcfc79da4';

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
      body: `— Suspiro... ¿Qué quieres ahora, ${name}?`,
      thumbnail: icons, 
      sourceUrl: redes, 
      mediaType: 1,
      renderLargerThumbnail: false
    }
  };

  if (!args[0]) {
    return conn.reply(m.chat, `*— (Bostezo)*... ¿Viniste a pedirme algo sin siquiera saber qué? No soy adivina.\n\n🎧 ᥱȷᥱm⍴ᥣ᥆:\n${usedPrefix}play *Linger - The Cranberries*`, m, { contextInfo });
  }

  const isMode = ["audio", "video"].includes(args[0].toLowerCase());
  const type = isMode ? args[0].toLowerCase() : null;
  const query = isMode ? args.slice(1).join(" ") : args.join(" ");

  if (isMode) {
    await m.react(type === 'audio' ? "🎧" : "📽️");
    try {
      const response = await axios.get(`${API_BASE}?url=${encodeURIComponent(query)}&type=${type}&apikey=${API_KEY}`);
      const res = response.data;

      if (res.status && res.data.download.url) {
        const title = res.data.title;
        const author = res.data.uploader || 'Desconocido';
        const downloadUrl = res.data.download.url;
        const thumbUrl = res.data.thumbnail;

        if (type === 'audio') {
          // Descargamos la imagen para usarla de carátula
          let thumbBuffer = null;
          try {
            const imgRes = await fetch(thumbUrl);
            thumbBuffer = Buffer.from(await imgRes.arrayBuffer());
          } catch (e) {
            console.error("Error al obtener miniatura:", e);
          }

          await conn.sendMessage(m.chat, { 
            audio: { url: downloadUrl }, 
            mimetype: "audio/mpeg", 
            fileName: `${title}.mp3`,
            jpegThumbnail: thumbBuffer, // Esta es la "foto" que sale en el icono de audio
            contextInfo: {
              externalAdReply: {
                title: title,
                body: author,
                thumbnail: thumbBuffer,
                mediaType: 2,
                sourceUrl: query
              }
            }
          }, { quoted: m });
          await m.react("🎧");
        } else {
          await conn.sendMessage(m.chat, { 
            video: { url: downloadUrl }, 
            caption: `🎬 *Aquí tienes.*\n\n🦈 *Contenido:* ${title}\n👤 *Autor:* ${author}`, 
            mimetype: "video/mp4" 
          }, { quoted: m });
          await m.react("📽️");
        }
      } else {
        throw new Error("Respuesta de API inválida");
      }
      return;
    } catch (error) {
      console.error("Error API Causas:", error.response?.data || error.message);
      await m.react("❌");
      return conn.reply(m.chat, `*— Tsk...* Hubo un problema.`, m);
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

  await conn.sendMessage(m.chat, {
    image: { url: video.thumbnail },
    caption: `> *Título:* ${video.title}\n> *Canal:* ${video.author.name}`,
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
