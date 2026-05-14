import fetch from "node-fetch";
import axios from 'axios';
import pkg from '@whiskeysockets/baileys';
const { generateWAMessageContent } = pkg;

const CAUSA_API_KEY = 'causa-ee5ee31dcfc79da4';
const CAUSA_ENDPOINT = 'https://rest.apicausas.xyz/api/v1/descargas/tiktok';
const SIZE_LIMIT_MB = 100;

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = "⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄's 𝐒ervice";

const images = [
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/086ec8e8-c373-45b6-ad51-3cdaef9cd3e6.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/c99835de-0c28-4e27-93a0-422df6cca849.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/6eee1198-1b0f-4cfe-b6c0-2fb82dc0bdc5.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/18b2ad5d-a091-4267-8903-bb895dbefe6c.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/23912e87-2b42-468c-bfd4-a4df62951c10.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/7d874ab7-8a4c-4d76-b7dc-dfbcb589bd9b.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/42f1cc96-bcd5-4c43-ac58-96883dba3047.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/407e16b8-89d4-4d09-bd2f-a606ccc0e53c.jpg?raw=true"
];

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const name = conn.getName(m.sender);
  const channelUrl = typeof redes !== 'undefined' ? redes : 'https://github.com/nevi-dev';
  args = args.filter(v => v?.trim());

  // --- FUNCIÓN DE BYPASS (COMO EN ROBARWAIFU/MENU) ---
  const sendBypassMsg = async (text, mentions = []) => {
    try {
      const randomImage = images[Math.floor(Math.random() * images.length)];
      const { data: thumb } = await conn.getFile(randomImage);
      const messageContent = await generateWAMessageContent(
        { image: { url: randomImage } },
        { upload: conn.waUploadToServer }
      );
      const imageMsg = messageContent.imageMessage;

      const content = {
        extendedTextMessage: {
          text: `${text}\n\n${channelUrl}`,
          matchedText: channelUrl,
          description: "Victoria Housekeeping Service - ZZZ",
          title: "𝐄llen 𝐉ᴏ𝐄's 𝐒ervice 🦈",
          previewType: 0,
          jpegThumbnail: thumb,
          thumbnailDirectPath: imageMsg.directPath,
          thumbnailSha256: imageMsg.fileSha256,
          thumbnailEncSha256: imageMsg.fileEncSha256,
          mediaKey: imageMsg.mediaKey,
          mediaKeyTimestamp: imageMsg.mediaKeyTimestamp,
          thumbnailHeight: 720,
          thumbnailWidth: 1280,
          contextInfo: {
            mentionedJid: [m.sender, ...mentions],
            isForwarded: true,
            forwardingScore: 1,
            forwardedNewsletterMessageInfo: {
              newsletterJid,
              newsletterName,
              serverMessageId: -1
            }
          }
        }
      };
      await conn.relayMessage(m.chat, content, { quoted: m });
    } catch (e) {
      await conn.reply(m.chat, text, m);
    }
  };

  if (!args[0]) {
    return await sendBypassMsg(`*— (Bostezo)*... ¿Viniste a pedirme algo sin saber qué?\n\n🎧 ᥱȷᥱm⍴ᥣ᥆:\n${usedPrefix}${command} https://vt.tiktok.com/ZSmrDCvrS/`);
  }

  const isMode = ["audio", "video"].includes(args[0].toLowerCase());
  const type = isMode ? (args[0].toLowerCase() === "audio" ? "mp3" : "mp4") : "info";
  const queryOrUrl = isMode ? args[1] : args[0];

  await m.react("🔎");

  try {
    const apiUrl = `${CAUSA_ENDPOINT}?apikey=${CAUSA_API_KEY}&url=${encodeURIComponent(queryOrUrl)}&type=${type}`;
    const res = await fetch(apiUrl);
    const json = await res.json();

    if (!json.status) throw new Error(json.msg || 'No se pudo obtener el contenido.');
    const data = json.data;

    if (isMode) {
      const downloadUrl = data.download?.url;
      if (!downloadUrl) throw new Error("No se encontró el enlace de descarga.");

      const response = await axios.head(downloadUrl);
      const fileSizeMb = (parseInt(response.headers['content-length']) || 0) / (1024 * 1024);

      if (fileSizeMb > SIZE_LIMIT_MB) {
        await conn.sendMessage(m.chat, {
          document: { url: downloadUrl },
          fileName: `${data.titulo || 'tiktok'}.${type === 'mp3' ? 'mp3' : 'mp4'}`,
          mimetype: type === 'mp3' ? 'audio/mpeg' : 'video/mp4',
          caption: `⚠️ *Archivo pesado (${fileSizeMb.toFixed(2)} MB)*.\n\n> *Título:* ${data.titulo}`
        }, { quoted: m });
      } else {
        const media = type === 'mp3' 
          ? { audio: { url: downloadUrl }, mimetype: "audio/mpeg", fileName: `tiktok.mp3` }
          : { video: { url: downloadUrl }, caption: `🎬 *Aquí tienes.*\n\n> *Título:* ${data.titulo}`, mimetype: "video/mp4" };
        
        await conn.sendMessage(m.chat, media, { quoted: m });
      }
      await m.react("✅");

    } else {
      const vistasStr = (data.vistas !== undefined && data.vistas !== null) 
                        ? data.vistas.toLocaleString() 
                        : '0';
      
      const caption = `₊‧꒰ 🦈 ꒱ 𝙏𝙄𝙆𝙏𝙊𝙆 𝙄𝙉𝙁𝙊\n\n> *Autor:* ${data.autor || 'Desconocido'}\n> *Título:* ${data.titulo || 'Sin título'}\n> *Duración:* ${data.duracion || '---'}\n> *Vistas:* ${vistasStr}\n\n*— Elige si quieres audio o video.*`;

      const buttons = [
        { buttonId: `${usedPrefix}${command} video ${queryOrUrl}`, buttonText: { displayText: '🎬 𝙑𝙄𝘿𝙀𝙊' }, type: 1 },
        { buttonId: `${usedPrefix}${command} audio ${queryOrUrl}`, buttonText: { displayText: '🎧 𝘼𝙐𝘿𝙄𝙊' }, type: 1 }
      ];

      await conn.sendMessage(m.chat, {
        image: { url: data.thumbnail || images[0] }, // Miniatura del video o Ellen Joe
        caption,
        footer: 'Victoria Housekeeping Service',
        buttons,
        headerType: 4,
        contextInfo: {
            mentionedJid: [m.sender],
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid,
                newsletterName,
                serverMessageId: -1
            }
        }
      }, { quoted: m });
    }

  } catch (e) {
    console.error(e);
    await m.react("❌");
    await sendBypassMsg(`*— Tsk...* Falló el servicio: ${e.message}`);
  }
};

handler.help = ['tiktok <URL>'];
handler.tags = ['descargas'];
handler.command = ['tiktok', 'tt'];
handler.register = true;

export default handler;
