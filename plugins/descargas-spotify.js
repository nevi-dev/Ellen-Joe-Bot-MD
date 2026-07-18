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

  };

  if (!spotifyUrl) {
    return m.replyExternal(`🎶 *¿᥎іᥒіs𝗍ᥱ ᥲ ⍴ᥱძіrmᥱ ᥲᥣg᥆ sіᥒ sᥲᑲᥱr 𝗊ᥙᥱ́?*\nძі ᥣ᥆ 𝗊ᥙᥱ 𝗊ᥙіᥱrᥱs... ᥆ ᥎ᥱ𝗍ᥱ.\n\n🎧 ᥱȷᥱm⍴ᥣ᥆:\n${usedPrefix}${command} https://open.spotify.com/track/...`, { contextInfo });
  }

  if (!/open\.spotify\.com/.test(spotifyUrl)) {
    return m.replyExternal(`💔 *Fallé al procesar tu capricho.* Esa URL no es de Spotify.`, { contextInfo });
  }

  await m.react("📥");

  try {
    // 1. CONSULTA A LA API
    const { data: response } = await axios.get(`https://rest.apicausas.xyz/api/v1/descargas/spotify`, {
      params: {
        url: spotifyUrl,
        apikey: CAUSA_API_KEY
      }
    });

    // 2. VERIFICACIÓN Y EXTRACCIÓN (Basado en tu nuevo JSON)
    if (response.status && response.data) {
      const { title, artist, thumbnail, download } = response.data;
      const audioUrl = download.url;

      const caption = `
₊‧꒰ 🎧 ꒱ 𝙀𝙇𝙇𝙀𝙉 𝙅𝙊𝙀 𝙎𝙋𝙊𝙏𝙄𝙁𝙔 ✧˖°
︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶   ︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶

> 🎶 *Título:* ${title}
> 👤 *Artista:* ${artist}
> 🦈 *Servicio:* Ellen Joe's Service

*Procesando la pista musical... aguarda.*`;

      // 3. ENVIAR THUMBNAIL E INFO
      await conn.sendMessage(m.chat, {
        image: { url: thumbnail },
        caption: caption,
        footer: 'Dime cómo lo quieres... o no digas nada ┐(￣ー￣)┌.',
        contextInfo
      }, { quoted: m });

      await m.react("🎧");

      // 4. DESCARGAR Y ENVIAR AUDIO
      const responseAudio = await axios.get(audioUrl, { responseType: 'arraybuffer' });
      const audioBuffer = Buffer.from(responseAudio.data);
      const fileSizeMb = audioBuffer.length / (1024 * 1024);

      if (fileSizeMb > SIZE_LIMIT_MB) {
          await conn.sendMessage(m.chat, {
              document: audioBuffer,
              fileName: `${title}.mp3`,
              mimetype: 'audio/mpeg',
              caption: `⚠️ *Archivo pesado (${fileSizeMb.toFixed(2)} MB). Se envía como documento.*`
          }, { quoted: m });
          await m.react("📄");
      } else {
          await conn.sendMessage(m.chat, {
              audio: audioBuffer,
              mimetype: "audio/mpeg",
              fileName: `${title}.mp3`
          }, { quoted: m });
          await m.react("✅");
      }

    } else {
      throw new Error("Sin respuesta de datos.");
    }
  } catch (e) {
    console.error(e);
    await m.react("❌");
    conn.reply(m.chat, `💔 *Error crítico.* No pude traer la música, Proxy.`, m);
  }
};

handler.help = ['spotify <url>'];
handler.tags = ['descargas'];
handler.command = ['spotify', 'sp'];
handler.register = true;

export default handler;
