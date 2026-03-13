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
    return conn.reply(m.chat, `*— (Bostezo)*... ¿Viniste a pedirme algo sin siquiera saber qué?\n\n🎧 Ejemplo:\n${usedPrefix}play *Linger*`, m, { contextInfo: globalContext });
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

      const response = await axios.get(`${API_BASE}?url=${encodeURIComponent(query)}&type=${type}&apikey=${API_KEY}`);
      const res = response.data;

      if (res.status && res.data.download.url) {
        const downloadUrl = res.data.download.url;

        if (type === 'audio') {
          let thumbBuffer = null;
          try {
            const imgRes = await fetch(thumbUrl);
            thumbBuffer = Buffer.from(await imgRes.arrayBuffer());
          } catch (e) {}

          await conn.sendMessage(m.chat, { 
            audio: { url: downloadUrl }, 
            mimetype: "audio/mpeg", 
            fileName: `${title}.mp3`,
            title: title, 
            body: author,
            jpegThumbnail: thumbBuffer,
            contextInfo: globalContext // Solo info de reenvío/newsletter, sin AdReply
          }, { quoted: m });
          await m.react("🎧");
        } else {
          await conn.sendMessage(m.chat, { 
            video: { url: downloadUrl }, 
            caption: `🎬 *Aquí tienes.*\n\n🦈 *Contenido:* ${title}`, 
            mimetype: "video/mp4",
            contextInfo: globalContext
          }, { quoted: m });
          await m.react("📽️");
        }
      } else {
        throw new Error("Respuesta de API inválida");
      }
      return;
    } catch (error) {
      await m.react("❌");
      return conn.reply(m.chat, `*— Tsk...* Hubo un error con el servidor.`, m);
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
    caption: `> ૢ⃘꒰🍭⃝︩֟፝ *Título:* ${video.title}\n> ૢ⃘꒰👤⃝︩֟፝ *Canal:* ${video.author.name}\n\n*— Elige rápido.*`,
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
