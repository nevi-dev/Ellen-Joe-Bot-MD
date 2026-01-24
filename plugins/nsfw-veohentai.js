import fetch from 'node-fetch';

// --- CONFIGURACIÓN DE LA API ---
const API_BASE_URL = "https://api-causas.duckdns.org/api/v1/nsfw/descargas/veohentai";
const API_KEY = "causa-ee5ee31dcfc79da4";

// --- CONFIGURACIÓN DE CANAL ---
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice';

const handler = async (m, { conn, args, usedPrefix, command }) => {
    const name = conn.getName(m.sender);
    
    // 1. Verificación de NSFW
    const chat = global.db.data.chats[m.chat];
    if (m.isGroup && !chat?.nsfw) {
        return m.reply(`*¿En serio vas a pedir eso aquí?* 🔞\nEste lugar es demasiado "santo". Si quieres que trabaje, activa el modo NSFW: *${usedPrefix}nsfw on*`);
    }

    // Configuración de ContextInfo (Igual a tu comando Play)
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
            body: `— Suspiro... Solo te daré esto una vez, ${name}.`,
            thumbnail: icons, 
            sourceUrl: redes, 
            mediaType: 1,
            renderLargerThumbnail: false
        }
    };

    // 2. Validación de Argumentos
    if (!args[0]) {
        return conn.reply(m.chat, `*— (Bostezo)*... ¿Me vas a dar un nombre o vas a seguir mirándome? No busco cosas por instinto.\n\n🎧 ᥱȷᥱm⍴ᥣ᥆:\n${usedPrefix + command} *overflow*`, m, { contextInfo });
    }

    const query = args.join(' ');
    const isUrl = query.match(/https?:\/\/veohentai\.com\//i);
    const queryParam = isUrl ? `url=${encodeURIComponent(query)}` : `q=${encodeURIComponent(query)}`;
    const queryUrl = `${API_BASE_URL}?${queryParam}&subs=false&apikey=${API_KEY}`;

    try {
        await m.react('⏳');

        const response = await fetch(queryUrl);
        const json = await response.json();

        if (!json.status || !json.data) {
            await m.react('❌');
            return conn.reply(m.chat, `*Cero unidades encontradas.* 🦈\nNo hay nada de "${query}" aquí. Qué pérdida de tiempo.`, m, { contextInfo });
        }

        const { title, info, download_url, thumbnail } = json.data;

        // 3. Metadata con estética de Ellen
        let infoText = `
┈۪۪۪۪۪۪۪۪ٜ̈᷼─۪۪۪۪ٜ࣪᷼┈۪۪۪۪۪۪۪۪ٜ݊᷼⁔᮫ּׅ̫ׄ࣪︵᮫ּ๋ׅׅ۪۪۪۪ׅ࣪࣪͡⌒🌀𔗨⃪̤̤̤ٜ۫۫۫҈҈҈҈҉҉᷒ᰰ꤬۫۫۫𔗨̤̤̤𐇽─۪۪۪۪ٜ᷼┈۪۪۪۪۪۪۪۪ٜ̈᷼─۪۪۪۪ٜ࣪᷼┈۪۪۪۪݊᷼
₊‧꒰ 🦈 ꒱ 𝙀𝙇𝙇𝙀𝙉 𝙅𝙊𝙀 𝙎𝙀𝙍𝙑𝙄𝘾𝙀 — 𝙃𝙀𝙉𝙏𝘼𝙄 ✧˖°
︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶    ︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶

> ૢ⃘꒰ 🎬 ⃝︩֟፝ *Título:* ${title}
> ૢ⃘꒰ 🏢 ⃝︩֟፝ *Estudio:* ${info.estudio || 'N/A'}
> ૢ⃘꒰ 🏷️ ⃝︩֟፝ *Tags:* ${info.tags ? info.tags.join(', ') : 'Vacio'}

*— Espera a que cargue el video. No seas impaciente.*
⌣᮫ֶุ࣪ᷭ⌣〫᪲꒡᳝۪︶᮫໋࣭〭〫𝆬࣪࣪𝆬࣪꒡ֶ〪࣪ ׅ۫ெ᮫〪⃨〫〫᪲࣪˚̥ׅ੭ֶ֟ৎ᮫໋ׅ̣𝆬  ּ֢̊࣪⡠᮫ ໋🦈᮫ุ〪〪〫〫ᷭ ݄࣪⢄ꠋּ֢ ࣪ ֶׅ੭ֶ̣֟ৎ᮫˚̥࣪ெ᮫〪〪⃨〫᪲ ࣪꒡᮫໋〭࣪𝆬࣪︶〪᳝۪ꠋּ꒡ׅ⌣᮫ֶ࣪᪲⌣᮫ุ᳝〫֩ᷭ`;

        // Enviar Información inicial con Portada e icons/redes
        await conn.sendMessage(m.chat, { 
            image: { url: thumbnail || 'https://qu.ax/ZpYp.jpg' }, 
            caption: infoText,
            contextInfo 
        }, { quoted: m });

        // 4. Enviar el Video
        if (download_url) {
            await conn.sendMessage(m.chat, { 
                video: { url: download_url }, 
                caption: `🎬 *Misión cumplida.* ${title}\n\n*Redes:* ${global.redes}`, 
                mimetype: 'video/mp4',
                contextInfo
            }, { quoted: m });
            await m.react('✅');
        }

    } catch (e) {
        console.error('Error:', e);
        await m.react('❌');
        await conn.reply(m.chat, `*— Tsk...* Algo se rompió en el servidor. Arréglatelas solo por ahora.`, m, { contextInfo });
    }
};

handler.help = ['veohentai <búsqueda>'];
handler.tags = ['nsfw'];
handler.command = ['veohentai', 'vh'];
handler.register = true;

export default handler;
