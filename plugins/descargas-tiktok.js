import fetch from "node-fetch";
import axios from 'axios';

const CAUSA_API_KEY = 'causa-ee5ee31dcfc79da4';
const CAUSA_ENDPOINT = 'https://rest.apicausas.xyz/api/v1/descargas/tiktok';
const SIZE_LIMIT_MB = 100;

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const name = conn.getName(m.sender);
  args = args.filter(v => v?.trim());

  const contextInfo = {
    mentionedJid: [m.sender],
    isForwarded: true,
    forwardingScore: 999,
    externalAdReply: {
      title: '🦈 𝙑𝙄𝘾𝙏𝙊𝙍𝙄𝘼 𝙃𝙊𝙐𝙎𝙀𝙆𝙀𝙀𝙋𝙄𝙉𝙂',
      body: `— Suspiro... ¿Qué quieres ahora, ${name}?`,
      thumbnail: icons, // Usando tu Buffer definido
      sourceUrl: redes, // Usando tu variable definida
      mediaType: 1,
      renderLargerThumbnail: false
    }
  };

  if (!args[0]) {
    return conn.reply(m.chat, `*— (Bostezo)*... ¿Viniste a pedirme algo sin saber qué?\n\n🎧 ᥱȷᥱm⍴ᥣ᥆:\n${usedPrefix}${command} https://vt.tiktok.com/ZSmrDCvrS/`, m, { contextInfo });
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
      // --- MODO DESCARGA ---
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
      // --- MODO INFO (VISTA PREVIA) ---
      // Manejo seguro de 'vistas' para evitar el error de toString/toLocaleString
      const vistasStr = (data.vistas !== undefined && data.vistas !== null) 
                        ? data.vistas.toLocaleString() 
                        : '0';
      
      const caption = `₊‧꒰ 🦈 ꒱ 𝙀𝙇𝙇𝙀𝙉 𝙅𝙊𝙀 𝙏𝙄𝙆𝙏𝙊𝙆\n\n> *Autor:* ${data.autor || 'Desconocido'}\n> *Título:* ${data.titulo || 'Sin título'}\n> *Duración:* ${data.duracion || '---'}\n> *Vistas:* ${vistasStr}\n\n*— Elige si quieres audio o video.*`;

      const buttons = [
        { buttonId: `${usedPrefix}${command} video ${queryOrUrl}`, buttonText: { displayText: '🎬 𝙑𝙄𝘿𝙀𝙊' }, type: 1 },
        { buttonId: `${usedPrefix}${command} audio ${queryOrUrl}`, buttonText: { displayText: '🎧 𝘼𝙐𝘿𝙄𝙊' }, type: 1 }
      ];

      await conn.sendMessage(m.chat, {
        image: icons, // Usamos tu Buffer de Ellen Joe
        caption,
        footer: 'Victoria Housekeeping Service',
        buttons,
        headerType: 4,
        contextInfo
      }, { quoted: m });
    }

  } catch (e) {
    console.error(e);
    await m.react("❌");
    return conn.reply(m.chat, `*— Tsk...* Falló el servicio: ${e.message}`, m);
  }
};

handler.help = ['tiktok <URL>'];
handler.tags = ['descargas'];
handler.command = ['tiktok', 'tt'];
handler.register = true;

export default handler;
