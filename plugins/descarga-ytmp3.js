import axios from 'axios';

// --- Configuración API Causas ---
const API_BASE = 'https://rest.apicausas.xyz/api/v1/descargas/youtube';
const API_KEY = 'causa-ee5ee31dcfc79da4';
const SIZE_LIMIT_MB = 100; 

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

var handler = async (m, { conn, args, usedPrefix, command }) => {
    const name = conn.getName(m.sender);
    const url = args[0];

    const contextInfo = {
        mentionedJid: [m.sender],
        isForwarded: true,
        forwardingScore: 999,
        forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 },
        externalAdReply: {
            title: '🦈 𝙑𝙄𝘾𝙏𝙊𝙍𝙄𝘼 𝙃𝙊𝙐𝙎Ｅ𝙆ＥＥ𝙋𝙄𝙉𝙂',
            body: `✦ ¿Otra vez tú, ${name}? Ya estoy trabajando...`, 
            thumbnail: global.icons, 
            sourceUrl: global.redes, 
            mediaType: 1,
            renderLargerThumbnail: false
        }
    };

    if (!url) {
        return conn.reply(
            m.chat,
            `🦈 *— (Bostezo)*... Dame un enlace de YouTube. No me hagas perder el tiempo.\n\n_Uso: ${usedPrefix + command} https://youtu.be/video_`,
            m,
            { contextInfo, quoted: m }
        );
    }

    await conn.reply(m.chat, `✦ *Procesando...* Estoy conectando con el servidor. No me presiones.`, m, { contextInfo, quoted: m });
    await m.react("🎧");

    try {
        // Petición única a API Causas
        const response = await axios.get(`${API_BASE}?url=${encodeURIComponent(url)}&type=audio&apikey=${API_KEY}`);
        const res = response.data;

        if (res.status && res.data.download.url) {
            const { title, download } = res.data;
            const downloadUrl = download.url;
            
            await m.react("📥");

            // Verificar tamaño para decidir si enviar como Audio o Documento
            const checkHeader = await axios.head(downloadUrl);
            const fileSizeMb = (checkHeader.headers['content-length'] || 0) / (1024 * 1024);

            if (fileSizeMb > SIZE_LIMIT_MB) {
                await conn.sendMessage(m.chat, {
                    document: { url: downloadUrl },
                    fileName: `${title}.mp3`,
                    mimetype: 'audio/mpeg',
                    caption: `🦈 *Pesado...* (${fileSizeMb.toFixed(2)} MB).\n\nSupera el límite de audio directo, así que va como documento.\n\n🎵 *Archivo:* ${title}`
                }, { quoted: m });
                await m.react("📄");
            } else {
                await conn.sendMessage(m.chat, { 
                    audio: { url: downloadUrl }, 
                    mimetype: 'audio/mpeg', 
                    fileName: `${title}.mp3`,
                    ptt: false 
                }, { quoted: m });
                await m.react("✅");
            }

        } else {
            throw new Error("API devolvió estado falso");
        }

    } catch (error) {
        console.error("Error API Causas:", error.message);
        await m.react("❌");
        await conn.reply(m.chat, `🦈 *Tsk...* Hubo un problema con la API de Causas. El enlace no sirve o mi llave se quedó sin energía.`, m, { contextInfo });
    }
};

handler.help = ['ytmp3 <link>'];
handler.tags = ['descargas'];
handler.command = ['ytmp3'];
handler.register = true;
handler.limit = true;

export default handler;
