import axios from 'axios';

// --- Constantes y Configuración de Transmisión (Estilo Ellen Joe) ---
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

const query = ['story%20wa', 'story%20sad', 'video%20fun', 'story%20wa%20galau', 'story%20wa%20sindiran', 'story%20wa%20bahagia', 'story%20wa%20lirik%20lagu%20overlay', 'story%20wa%20lirik%20lagu', 'video%20viral'];

let handler = async (m, { conn, usedPrefix, command }) => {
    const name = conn.getName(m.sender); // Identificando al Proxy

    const contextInfo = {
        mentionedJid: [m.sender],
        isForwarded: true,
        forwardingScore: 999,
        forwardedNewsletterMessageInfo: {
            newsletterJid,
            newsletterName,
            serverMessageId: -1
        },

    };

    m.react('🔄'); // Reacción de procesamiento
    conn.reply(
        m.chat,
        `🔄 *Iniciando barrido de TikTok para rastrear transmisiones aleatorias, Proxy ${name}.* Aguarda, la decodificación está en curso.`,
        m,
        { contextInfo, quoted: m }
    );

    try {
        // Usa .getRandom() de forma segura, asumiendo que ya tienes un prototipo de Array.
        // Si no, necesitarías definirlo o usar Math.random() directamente.
        // Array.prototype.getRandom = function() { return this[Math.floor(Math.random() * this.length)]; };
        const selectedQuery = query[Math.floor(Math.random() * query.length)]; // Forma alternativa si no tienes .getRandom()

        const tiktokData = await tiktoks(selectedQuery);

        // Construir el caption con la información disponible y estilo Ellen Joe
        const caption = `
╭━━━━[ 𝚃𝚒𝚔𝚃𝚘𝚔 𝙰𝚕𝚎𝚊𝚝𝚘𝚛𝚒𝚘 𝙳𝚎𝚌𝚘𝚍𝚎𝚍: 𝙵𝚕𝚞𝚓𝚘 𝙰𝚜𝚎𝚐𝚞𝚛𝚊𝚍𝚘 ]━━━━⬣
📹 *Designación:* ${tiktokData.title || 'Sin título'}
🧑‍💻 *Fuente Operacional:* ${tiktokData.authorNickname || 'Desconocido'}
⏱️ *Duración del Flujo:* ${tiktokData.duration ? `${Math.floor(tiktokData.duration / 60)}m ${tiktokData.duration % 60}s` : 'N/A'}
❤️ *Impacto Registrado:* ${tiktokData.likeCount ? tiktokData.likeCount.toLocaleString() : 'N/A'} (Me gusta)
🎵 *Música de Fondo:* ${tiktokData.musicTitle || 'N/A'} por ${tiktokData.musicAuthor || 'N/A'}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`;

        conn.sendMessage(m.chat, { video: { url: tiktokData.no_watermark }, caption: caption }, { quoted: m });
        m.react('✅'); // Reacción de éxito

    } catch (err) {
        console.error("Error al obtener TikTok aleatorio:", err);
        conn.reply(
            m.chat,
            `❌ *Fallo en el barrido de TikTok, Proxy ${name}.*\nNo se encontraron transmisiones adecuadas o la señal es inestable. Intenta de nuevo.\nDetalles: ${err.message || err}`,
            m,
            { contextInfo, quoted: m }
        );
        m.react('❌'); // Reacción de fallo
    }
}

handler.help = ['tiktokrandom'];
handler.tags = ['descargas'];
handler.command = ['ttrandom', 'tiktokrandom'];
handler.limit = true;
handler.group = true;
handler.register = true;
handler.coin = 2;

export default handler;

async function tiktoks(query) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axios({
                method: 'POST',
                url: 'https://tikwm.com/api/feed/search',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Cookie': 'current_language=en',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
                },
                data: {
                    keywords: query,
                    count: 10,
                    cursor: 0,
                    HD: 1
                }
            });
            const videos = response.data.data.videos;
            if (videos.length === 0) {
                reject("No se encontraron videos.");
            } else {
                const videorndm = videos[Math.floor(Math.random() * videos.length)];

                const result = {
                    title: videorndm.title,
                    cover: videorndm.cover,
                    origin_cover: videorndm.origin_cover,
                    no_watermark: videorndm.play,
                    watermark: videorndm.wmplay,
                    music: videorndm.music,
                    authorNickname: videorndm.author?.nickname, // Añadido
                    duration: videorndm.duration, // Añadido
                    likeCount: videorndm.digg_count, // Añadido
                    musicTitle: videorndm.music_info?.title, // Añadido
                    musicAuthor: videorndm.music_info?.author // Añadido
                };
                resolve(result);
            }
        } catch (error) {
            reject(error);
        }
    });
}
