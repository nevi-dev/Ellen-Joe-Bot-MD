import axios from 'axios';

// --- CONFIGURACIÓN ---
const CAUSA_API_KEY = 'causa-ee5ee31dcfc79da4'; 
const SIZE_LIMIT_MB = 100;
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const name = conn.getName(m.sender);
  const spotifyUrl = args[0];

  const contextInfo = {
    mentionedJid: [m.sender],
    isForwarded: true,
    forwardingScore: 999,
    forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 },
    externalAdReply: {
      title: '🖤 ⏤͟͟͞͞𝙀𝙇𝙇𝙀𝙉 - 𝘽𝙊𝙏 ᨶ႒ᩚ',
      body: `✦ 𝙋𝙧𝙤𝙘𝙚𝙨𝙖𝙣𝙙𝙤 𝙩𝙪 𝙥𝙞𝙨𝙩𝙖, ${name}...`,
      thumbnail: icons, 
      sourceUrl: redes, 
      mediaType: 1,
      renderLargerThumbnail: false
    }
  };

  if (!spotifyUrl) return conn.reply(m.chat, `🎶 *¿Vienes con las manos vacías?*\nUsa: ${usedPrefix}${command} <enlace de spotify>`, m, { contextInfo });

  await m.react("📥");

  try {
    // 1. PETICIÓN A LA API
    const apiUrl = `https://rest.apicausas.xyz/api/v1/descargadores/spotify?url=${encodeURIComponent(spotifyUrl)}&apikey=${CAUSA_API_KEY}`;
    const { data: response } = await axios.get(apiUrl);

    if (!response.status || !response.data) {
      throw new Error("No se obtuvieron datos de la canción.");
    }

    // 2. EXTRACCIÓN DE DATOS (Basado en tu JSON)
    const { title, artist, thumbnail, download } = response.data;
    const audioUrl = download.url;

    const caption = `₊‧꒰ 🎧 ꒱ 𝙀𝙇𝙇𝙀𝙉 𝙅𝙊𝙀 𝙎𝙋𝙊𝙏𝙄𝙁𝙔 ✧˖°
︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶   ︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶

> 🎶 *Título:* ${title}
> 👤 *Artista:* ${artist}
> 🦈 *Servicio:* Ellen Joe's Service

*Enviando el audio, no te desesperes...*`;

    // 3. ENVIAR PORTADA E INFO
    await conn.sendMessage(m.chat, {
      image: { url: thumbnail },
      caption: caption,
      contextInfo
    }, { quoted: m });

    // 4. DESCARGAR EL AUDIO
    const audioResponse = await axios.get(audioUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(audioResponse.data);
    const fileSizeMb = buffer.length / (1024 * 1024);

    // 5. ENVIAR AUDIO O DOCUMENTO
    if (fileSizeMb > SIZE_LIMIT_MB) {
      await conn.sendMessage(m.chat, {
        document: buffer,
        fileName: `${title}.mp3`,
        mimetype: 'audio/mpeg'
      }, { quoted: m });
      await m.react("📄");
    } else {
      await conn.sendMessage(m.chat, {
        audio: buffer,
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`
      }, { quoted: m });
      await m.react("✅");
    }

  } catch (e) {
    console.error("Error en Spotify:", e);
    await m.react("❌");
    conn.reply(m.chat, `💔 *Anomalía detectada.* No pude traer la pista.`, m);
  }
};

handler.help = ['spotify <url>'];
handler.tags = ['descargas'];
handler.command = ['spotify', 'sp'];
handler.register = true;

export default handler;
