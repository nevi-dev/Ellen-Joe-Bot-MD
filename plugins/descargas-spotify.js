import axios from 'axios';

// --- CONFIGURACIÓN ---
const CAUSA_API_KEY = 'causa-ee5ee31dcfc79da4'; 
const SIZE_LIMIT_MB = 100;
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const name = conn.getName(m.sender);
  const spotifyUrl = args[0];

  if (!spotifyUrl) return conn.reply(m.chat, `🎶 *¿Vienes con las manos vacías?*\nUsa: ${usedPrefix}${command} <link>`, m);

  await m.react("📥");

  try {
    // 1. OBTENER DATOS DE LA API
    const apiUrl = `https://rest.apicausas.xyz/api/v1/descargadores/spotify?url=${encodeURIComponent(spotifyUrl)}&apikey=${CAUSA_API_KEY}`;
    const { data: response } = await axios.get(apiUrl);

    if (!response.status || !response.data) throw new Error("API sin respuesta válida.");

    const { title, artist, thumbnail, download } = response.data;
    const audioUrl = download.url;

    // 2. DESCARGAR EL BUFFER DEL AUDIO Y LA PORTADA
    // Descargamos ambos para procesarlos
    const [audioRes, thumbRes] = await Promise.all([
      axios.get(audioUrl, { responseType: 'arraybuffer' }),
      axios.get(thumbnail, { responseType: 'arraybuffer' })
    ]);

    const audioBuffer = Buffer.from(audioRes.data);
    const thumbBuffer = Buffer.from(thumbRes.data);
    const fileSizeMb = audioBuffer.length / (1024 * 1024);

    const caption = `₊‧꒰ 🎧 ꒱ 𝙀𝙇𝙇𝙀𝙉 𝙅𝙊𝙀 𝙎𝙋𝙊𝙏𝙄𝙁𝙔 ✧˖°\n\n> 🎶 *Título:* ${title}\n> 👤 *Artista:* ${artist}\n> 🦈 *Servicio:* Ellen Joe's Service`;

    // 3. ENVÍO ÚNICO (Audio con metadatos)
    // En WhatsApp, el caption en audios no siempre es visible, 
    // por lo que usamos contextInfo para mostrar la portada y texto.
    
    await conn.sendMessage(m.chat, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`,
      ptt: false, // Cambiar a true si quieres que se envíe como nota de voz
      contextInfo: {
        mentionedJid: [m.sender],
        externalAdReply: {
          title: `🎵 Reproduciendo: ${title}`,
          body: `Artista: ${artist}`,
          description: caption,
          mediaType: 2,
          thumbnail: thumbBuffer, // Portada de la canción
          sourceUrl: spotifyUrl,
          showAdAttribution: true
        }
      }
    }, { quoted: m });

    await m.react("✅");

  } catch (e) {
    console.error("Error en Spotify:", e);
    await m.react("❌");
    conn.reply(m.chat, `💔 *Anomalía detectada.*\n${e.message}`, m);
  }
};

handler.help = ['spotify <url>'];
handler.tags = ['descargas'];
handler.command = ['spotify', 'sp'];
handler.register = true;

export default handler;
