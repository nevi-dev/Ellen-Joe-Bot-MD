import axios from 'axios';
import yts from "yt-search";

const API_BASE = 'https://api-causas.duckdns.org/api/v1/descargas/youtube';
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
      thumbnail: icons, // Aquí pasas el Buffer directamente
      sourceUrl: redes, // Asegúrate de que esta variable esté definida arriba
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

  // --- LÓGICA DE DESCARGA (CONEXIÓN CON TU API) ---
  if (isMode) {
    await m.react(type === 'audio' ? "🎧" : "📽️");
    try {
      // Petición a tu API con los parámetros correctos
      const response = await axios.get(`${API_BASE}?url=${encodeURIComponent(query)}&type=${type}&apikey=${API_KEY}`);
      const res = response.data;

      // Según tu JSON: res.status es true y el archivo está en res.data.download.url
      if (res.status && res.data.download.url) {
        const title = res.data.title;
        const downloadUrl = res.data.download.url;
        
        if (type === 'audio') {
          await conn.sendMessage(m.chat, { 
            audio: { url: downloadUrl }, 
            mimetype: "audio/mpeg", 
            fileName: `${title}.mp3` 
          }, { quoted: m });
          await m.react("🎧");
        } else {
          await conn.sendMessage(m.chat, { 
            video: { url: downloadUrl }, 
            caption: `🎬 *Aquí tienes.* No me pidas nada más en un rato.\n\n🦈 *Contenido:* ${title}`, 
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
      return conn.reply(m.chat, `*— Tsk...* El servidor de descargas respondió con error. Intenta de nuevo.`, m);
    }
  }

  // --- LÓGICA DE BÚSQUEDA ---
  await m.react("🔍");
  let video;
  try {
    const searchResult = await yts(query);
    video = searchResult.videos?.[0];
  } catch (e) { return conn.reply(m.chat, `*— Error en búsqueda.*`, m); }

  if (!video) return conn.reply(m.chat, `*— No hay nada.*`, m);

  // --- MENÚ CON BOTONES ---
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
    contextInfo
  }, { quoted: m });
};

handler.help = ['play'].map(v => v + ' <búsqueda>');
handler.tags = ['descargas'];
handler.command = ['play'];
handler.register = true;

export default handler;
