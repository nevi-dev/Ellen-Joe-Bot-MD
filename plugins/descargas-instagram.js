import axios from 'axios';

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

const handler = async (m, { args, conn }) => {
  const name = conn.getName(m.sender) || 'Proxy';

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
      title: 'Ellen Joe: Pista localizada. 🦈',
      body: `Procesando solicitud para el/la Proxy ${name}...`,
      thumbnailUrl: icons,
      sourceUrl: redes,
      mediaType: 1,
      renderLargerThumbnail: true
    }
  };

  if (!args[0]) {
    return conn.reply(m.chat, `🦈 *Rastro frío, ${name}.* Necesito la URL del post o reel.`, m, { contextInfo, quoted: m });
  }

  const url = args[0].trim();
  if (!url.match(/instagram\.com|instagr\.am/)) {
    return conn.reply(m.chat, `🚫 Ese enlace no parece de Instagram, ${name}.`, m, { contextInfo, quoted: m });
  }

  try {
    await m.react('🔄');

    await conn.sendMessage(m.chat, { 
      text: `🔄 *Localizando la pista visual, ${name}...* Aguarda un momento.` 
    }, { quoted: m });

    // ──────────────────────────────────────────────
    // Aquí va la petición real (no visible para el usuario)
    const { data: res } = await axios.get('https://rest.apicausas.xyz/api/v1/descargas/instagram', {
      params: { url, apikey: 'causa-ee5ee31dcfc79da4' },
      timeout: 30000
    });
    // ──────────────────────────────────────────────

    if (!res?.status || !res?.data) {
      throw new Error('fallo silencioso');
    }

    const { data } = res;
    const isVideo = data.download?.type?.includes('video') || data.download?.url?.endsWith('.mp4');
    const mediaCount = data.media_count || 1;

    const thumbContext = {
      ...contextInfo,
      externalAdReply: {
        ...contextInfo.externalAdReply,
        thumbnailUrl: data.thumbnail || icons,
        body: `Pista asegurada • ${data.title || 'Contenido'} • ${data.user || 'Usuario'}`,
        renderLargerThumbnail: true
      }
    };

    await conn.sendMessage(m.chat, {
      text: `✅ *Pista visual asegurada, ${name}*\n` +
            `${data.title ? `Título: ${data.title}\n` : ''}` +
            `Usuario: ${data.user || 'N/A'}\n` +
            `${data.likes ? `❤️ ${data.likes}\n` : ''}` +
            `Contenido: ${isVideo ? 'Video/Reel' : 'Imagen'}${mediaCount > 1 ? ` (${mediaCount})` : ''}`,
      footer: 'Ellen Joe\'s Service 🦈',
      templateButtons: [{ urlButton: { displayText: 'Ver original', url } }]
    }, { quoted: m, ...thumbContext });

    if (isVideo && data.download?.url) {
      await conn.sendMessage(m.chat, {
        video: { url: data.download.url },
        caption: `📹 *Carga visual completada*\n${data.title || ''}\n👤 ${data.user || ''}${data.likes ? ` ❤️ ${data.likes}` : ''}\n🔗 ${url}`,
        mimetype: 'video/mp4',
        fileName: `visual_${data.user || 'reel'}.mp4`
      }, { quoted: m });

    } else if (mediaCount > 1 && Array.isArray(data.download)) {
      for (let i = 0; i < data.download.length; i++) {
        const item = data.download[i];
        const itemIsVideo = item.type?.includes('video') || item.url?.endsWith('.mp4');

        if (itemIsVideo) {
          await conn.sendMessage(m.chat, {
            video: { url: item.url },
            caption: `📹 Parte ${i+1}/${mediaCount}\n${data.title || ''} • ${data.user}`,
            mimetype: 'video/mp4'
          }, { quoted: m });
        } else {
          await conn.sendMessage(m.chat, {
            image: { url: item.url || item },
            caption: `🖼️ Imagen ${i+1}/${mediaCount}\n${data.title || ''} • ${data.user}`,
            mimetype: 'image/jpeg'
          }, { quoted: m });
        }
      }

    } else if (data.download?.url) {
      await conn.sendMessage(m.chat, {
        image: { url: data.download.url },
        caption: `🖼️ *Carga visual completada*\n${data.title || ''}\n👤 ${data.user || ''}${data.likes ? ` ❤️ ${data.likes}` : ''}\n🔗 ${url}`,
        mimetype: 'image/jpeg',
        fileName: `visual_${data.user || 'foto'}.jpg`
      }, { quoted: m });

    } else {
      throw new Error('sin contenido');
    }

    await m.react('✅');

  } catch (e) {
    await m.react('❌');
    conn.reply(m.chat, `🦈 *La pista se desvaneció, ${name}.*\nNo pude localizar el contenido. Intenta con otro enlace o espera un momento.`, m, { contextInfo, quoted: m });
  }
};

handler.command = ['instagram', 'ig', 'instadl'];
handler.tags = ['descargas'];
handler.help = ['ig <url>'];
handler.group = true;
handler.register = true;

export default handler;
