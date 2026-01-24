import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// --- CONFIGURACIÓN DE LA API ---
const API_BASE_URL = "https://api-causas.duckdns.org/api/v1/nsfw/descargas/veohentai";
const API_KEY = "causa-ee5ee31dcfc79da4";

// --- CONFIGURACIÓN DE CANAL ---
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice';

// Asegurar que la carpeta tmp existe al cargar el comando
if (!fs.existsSync('./tmp')) {
    fs.mkdirSync('./tmp');
}

const handler = async (m, { conn, args, usedPrefix, command }) => {
    const name = conn.getName(m.sender);

    // 1. Verificación de NSFW
    const chat = global.db.data.chats[m.chat];
    if (m.isGroup && !chat?.nsfw) {
        return m.reply(`*¿En serio vas a pedir eso aquí?* 🔞\nEste lugar es demasiado "santo". Si quieres que trabaje, activa el modo NSFW: *${usedPrefix}nsfw on*`);
    }

    // Configuración de ContextInfo
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
        return conn.reply(m.chat, `*— (Bostezo)*... ¿Me vas a dar un nombre o vas a seguir mirándome?\n\n🎧 ᥱȷᥱm⍴ᥣ᥆:\n${usedPrefix + command} *overflow*`, m, { contextInfo });
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
            return conn.reply(m.chat, `*Cero unidades encontradas.* 🦈\nNo hay nada de "${query}" aquí.`, m, { contextInfo });
        }

        const { title, info, download_url, thumbnail } = json.data;
        
        // Creamos una ruta de archivo única en la carpeta tmp
        const filePath = path.join('./tmp', `${Date.now()}.mp4`);

        let infoText = `
₊‧꒰ 🦈 ꒱ 𝙀𝙇𝙇𝙀𝙉 𝙅𝙊𝙀 𝙎𝙀𝙍𝙑𝙄𝘾𝙀 — 𝙃𝙀𝙉𝙏𝘼𝙄 ✧˖°

> 🎬 *Título:* ${title}
> 🏢 *Estudio:* ${info.estudio || 'N/A'}
> 🏷️ *Tags:* ${info.tags ? info.tags.join(', ') : 'Vacio'}

*— Descargando video al servidor... No seas impaciente.*`;

        await conn.sendMessage(m.chat, { 
            image: { url: thumbnail || 'https://qu.ax/ZpYp.jpg' }, 
            caption: infoText,
            contextInfo 
        }, { quoted: m });

        // 3. DESCARGA DIRECTA AL DISCO (Sin pasar por la RAM)
        const res = await fetch(download_url);
        const fileStream = fs.createWriteStream(filePath);

        await new Promise((resolve, reject) => {
            res.body.pipe(fileStream);
            res.body.on('error', (err) => {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                reject(err);
            });
            fileStream.on('finish', resolve);
        });

        // 4. ENVÍO DESDE EL ARCHIVO LOCAL
        if (fs.existsSync(filePath)) {
            await conn.sendMessage(m.chat, { 
                video: { url: filePath }, 
                caption: `🎬 *Misión cumplida.* ${title}\n\n*Redes:* ${global.redes}`, 
                mimetype: 'video/mp4',
                fileName: `${title}.mp4`,
                contextInfo
            }, { quoted: m });

            // 5. LIMPIEZA: Borrar el archivo después de enviar
            fs.unlinkSync(filePath);
            await m.react('✅');
        }

    } catch (e) {
        console.error('Error:', e);
        await m.react('❌');
        await conn.reply(m.chat, `*— Tsk...* Algo salió mal procesando el video pesado.`, m, { contextInfo });
    }
};

handler.help = ['veohentai <búsqueda>'];
handler.tags = ['nsfw'];
handler.command = ['veohentai', 'vh'];
handler.register = true;

export default handler;
