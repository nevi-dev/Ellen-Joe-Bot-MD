// Importa las librerías necesarias
import fetch from "node-fetch";
import axios from 'axios';
import fs from 'fs';

// Reemplaza 'TU_CLAVE_API' con tu clave real.
const NEVI_API_KEY = 'ellen';

const SIZE_LIMIT_MB = 100;
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏᴇ 𖥔 Sᥱrvice';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const name = conn.getName(m.sender);
  const spotifyUrl = args[0];

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
      thumbnail: icons, // Asume que 'icons' está definido en otro lugar
      sourceUrl: redes, // Asume que 'redes' está definido en otro lugar
      mediaType: 1,
      renderLargerThumbnail: false
    }
  };

  if (!spotifyUrl) {
    return conn.reply(m.chat, `🎶 *¿᥎іᥒіs𝗍ᥱ ᥲ ⍴ᥱძіrmᥱ ᥲᥣg᥆ sіᥒ sᥲᑲᥱr 𝗊ᥙᥱ́?*
ძі ᥣ᥆ 𝗊ᥙᥱ 𝗊ᥙіᥱrᥱs... ᥆ ᥎ᥱ𝗍ᥱ.

🎧 ᥱȷᥱm⍴ᥣ᥆:
${usedPrefix}spotify https://open.spotify.com/track/3k68kVFWTTBP0Jb4LOzCax`, m, { contextInfo });
  }

  const isSpotifyUrl = /^(https?:\/\/)?(www\.)?open\.spotify\.com\/.+$/i.test(spotifyUrl);
  if (!isSpotifyUrl) {
    return conn.reply(m.chat, `💔 *Fallé al procesar tu capricho.*
Esa URL no es de Spotify, ¿estás seguro de que es una URL válida?`, m, { contextInfo });
  }

  await m.react("📥");

  // Helper function to convert milliseconds to minutes and seconds
  const msToTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
  };

  try {
    const neviApiUrl = `http://neviapi.ddns.net:5000/spotify`;
    const res = await fetch(neviApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': NEVI_API_KEY,
      },
      body: JSON.stringify({
        url: spotifyUrl,
      }),
    });

    const json = await res.json();

    if (json.status === true && json.result && json.result.download) {
      const result = json.result;

      // Create the caption with all the song metadata
      const caption = `
₊‧꒰ 🎧꒱ 𝙀𝙇𝙇𝙀𝙉 𝙅𝙊𝙀 𝘽𝙊𝙏 — 𝙎𝙋𝙊𝙏𝙄𝙁𝙔 ✧˖°
︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶   ︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶   ︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶

> ૢ⃘꒰🎧⃝︩֟፝𐴲ⳋᩧ᪲ *Título:* ${result.title}
> ૢ⃘꒰👤⃝︩֟፝𐴲ⳋᩧ᪲ *Artista:* ${result.artists}
> ૢ⃘꒰💿⃝︩֟፝𐴲ⳋᩧ᪲ *Álbum:* ${result.album}
> ૢ⃘꒰⏱️⃝︩֟፝𐴲ⳋᩧ᪲ *Duración:* ${msToTime(result.duration_ms)}
> ૢ⃘꒰📅⃝︩֟፝𐴲ⳋᩧ᪲ *Lanzamiento:* ${result.release_date}
⌣᮫ֶุ࣪ᷭ⌣〫᪲꒡᳝۪︶᮫໋࣭〭〫𝆬࣪࣪𝆬࣪꒡ֶ〪࣪ ׅ۫ெ᮫〪⃨〫〫᪲࣪˚̥ׅ੭ֶ֟ৎ᮫໋ׅ̣𝆬  ּ֢̊࣪⡠᮫ ໋🦈᮫ຸ〪〪〫〫ᷭ ݄࣪⢄ꠋּ֢ ࣪ ֶׅ੭ֶ̣֟ৎ᮫˚̥࣪ெ᮫〪〪⃨〫᪲ ࣪꒡᮫໋〭࣪𝆬࣪︶〪᳝۪ꠋּ꒡ׅ⌣᮫ֶ࣪᪲⌣᮫ຸ᳝〫֩ᷭ
     ᷼͝ ᮫໋⏝᮫໋〪ׅ〫𝆬⌣ׄ𝆬᷼᷼᷼᷼᷼᷼᷼᷼᷼⌣᷑︶᮫᷼͡︶ׅ ໋𝆬⋰᩠〫 ᮫ׄ ׅ𝆬 ⠸᮫ׄ ׅ ⋱〫 ۪۪ׄ᷑𝆬︶᮫໋᷼͡︶ׅ 𝆬⌣᮫〫ׄ᷑᷼᷼᷼᷼᷼᷼᷼᷼᷼⌣᜔᮫ׄ⏝᜔᮫๋໋〪ׅ〫 ᷼͝`;

      // Send the image with the metadata caption
      await conn.sendMessage(m.chat, {
        image: { url: result.cover_url },
        caption: caption,
        footer: 'Dime cómo lo quieres... o no digas nada ┐(￣ー￣)┌.',
        headerType: 4,
        contextInfo
      }, { quoted: m });
      
      await m.react("🎧");

      // **CAMBIO IMPORTANTE:** Descarga el archivo de audio primero.
      const responseAudio = await axios.get(result.download, { responseType: 'arraybuffer' });
      const audioBuffer = Buffer.from(responseAudio.data);

      const fileSizeMb = audioBuffer.length / (1024 * 1024);
      if (fileSizeMb > SIZE_LIMIT_MB) {
          await conn.sendMessage(m.chat, {
              document: audioBuffer,
              fileName: `${result.title}.mp3`,
              mimetype: 'audio/mpeg',
              caption: `⚠️ *El archivo es muy grande (${fileSizeMb.toFixed(2)} MB), así que lo envío como documento. Puede tardar más en descargar.*
🖤 *Título:* ${result.title}`
          }, { quoted: m });
          await m.react("📄");
      } else {
          await conn.sendMessage(m.chat, {
              audio: audioBuffer,
              mimetype: "audio/mpeg",
              fileName: `${result.title}.mp3`
          }, { quoted: m });
          await m.react("🎧");
      }
      return;
    }
    throw new Error("NEVI API falló.");
  } catch (e) {
    console.error("Error con NEVI API:", e);
    await conn.reply(m.chat, `💔 *Fallé al procesar tu capricho.*
No pude traerte nada.`, m);
    await m.react("❌");
  }
};

handler.help = ['spotify'].map(v => v + ' <URL de Spotify>');
handler.tags = ['descargas'];
handler.command = ['spotify'];
handler.register = true;
handler.prefix = /^[./#]/;

export default handler;
