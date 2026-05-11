import { exec } from 'child_process';
import fs from 'fs';
import axios from 'axios';
import yts from "yt-search";
import { promisify } from 'util';
import path from 'path';
import pkg from '@whiskeysockets/baileys';
const { generateWAMessageContent, proto } = pkg;

const execPromise = promisify(exec);
const API_BASE = 'https://rest.apicausas.xyz/api/v1/descargas/youtubev2';
const API_KEY = 'causa-ee5ee31dcfc79da4';

// Configuración del Canal/Newsletter
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

const handler = async (m, { conn, args, usedPrefix, command }) => {
    const tmpDir = './tmp';
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    args = args.filter(v => v?.trim());
    const isMode = ["audio", "video"].includes(args[0]?.toLowerCase());
    const type = isMode ? args[0].toLowerCase() : null;
    const query = isMode ? args.slice(1).join(" ") : args.join(" ");

    // --- FUNCIÓN PARA EL BYPASS DE VISTA PREVIA ---
    const sendEllenPreview = async (text, imageUrl, urlForLink) => {
        // Usar global.icons (buffer) si no hay imageUrl, o descargar la de YT
        const { data: thumb } = imageUrl ? await conn.getFile(imageUrl) : { data: global.icons };
        
        const messageContent = await generateWAMessageContent(
            { image: imageUrl ? { url: imageUrl } : global.icons },
            { upload: conn.waUploadToServer }
        );

        const imageMsg = messageContent.imageMessage;

        const content = {
            extendedTextMessage: {
                text: `${text}\n\n${urlForLink}`,
                matchedText: urlForLink,
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
                    mentionedJid: [m.sender],
                    isForwarded: true,
                    forwardingScore: 999,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid,
                        newsletterName,
                        serverMessageId: -1
                    }
                }
            }
        };
        await conn.relayMessage(m.chat, content, { quoted: m });
    };

    // 1. Caso: Sin argumentos (Usa imagen de Ellen / Github)
    if (!args[0]) {
        const text = `*— (Bostezo)*... Dame algo que buscar.\n\n🎧 ᥱȷᥱm⍴ᥣ᥆:\n${usedPrefix}${command} *Linger*`;
        const githubUrl = "https://github.com/nevi-dev"; // Enlace necesario para que el bypass funcione
        return await sendEllenPreview(text, null, githubUrl); 
    }

    // 2. Caso: Descarga de Audio/Video
    if (isMode) {
        await m.react(type === 'audio' ? "🎧" : "🎬");
        try {
            const response = await axios.get(`${API_BASE}?url=${encodeURIComponent(query)}&type=${type}&apikey=${API_KEY}`);
            const res = response.data;

            if (res.status && res.data.download.url) {
                const { title, download: { url: downloadUrl } } = res.data;
                const fileName = `${Date.now()}`;
                const inputPath = path.join(tmpDir, `${fileName}_in`);
                const outputPath = path.join(tmpDir, `${fileName}.${type === 'audio' ? 'm4a' : 'mp4'}`);

                const fileRes = await axios({ url: downloadUrl, method: 'GET', responseType: 'stream' });
                const writer = fs.createWriteStream(inputPath);
                fileRes.data.pipe(writer);
                await new Promise(res => writer.on('finish', res));

                if (type === 'audio') {
                    await execPromise(`ffmpeg -i "${inputPath}" -c copy -movflags +faststart "${outputPath}"`);
                    await conn.sendMessage(m.chat, { 
                        audio: fs.readFileSync(outputPath), 
                        mimetype: 'audio/mp4', 
                        fileName: `${title}.m4a`,
                        ptt: false 
                    }, { quoted: m });
                } else {
                    await conn.sendMessage(m.chat, { 
                        video: { url: downloadUrl }, 
                        caption: `🎬 *Aquí tienes.*\n\n> *Contenido:* ${title}`, 
                        mimetype: "video/mp4" 
                    }, { quoted: m });
                }

                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                await m.react("✅");
            }
        } catch (error) {
            console.error(error);
            await m.react("❌");
            return conn.reply(m.chat, `*— Tsk...* Algo salió mal.`, m);
        }
        return;
    }

    // 3. Caso: Búsqueda (Usa miniatura de YT pero estilo Ellen)
    await m.react("🔍");
    const searchResult = await yts(query);
    const video = searchResult.videos?.[0];
    if (!video) return conn.reply(m.chat, `*— No encontré nada.*`, m);

    const caption = `₊‧꒰ 🦈 ꒱ 𝙀𝙇𝙇𝙀𝙉 𝙅𝙊𝙀 𝙎𝙀𝙍𝙑𝙄𝘾𝙀\n\n> *Título:* ${video.title}\n> *Uploader:* ${video.author.name}\n> *Duración:* ${video.timestamp}\n\n*— Elige si quieres audio o video.*`;

    // Enviamos la búsqueda con el estilo bypass
    await sendEllenPreview(caption, video.thumbnail, video.url);

    // Botones adicionales (Opcional, si tu versión de Baileys los soporta)
    await conn.sendMessage(m.chat, {
        text: 'Selecciona una opción:',
        footer: 'Victoria Housekeeping Service',
        buttons: [
            { buttonId: `${usedPrefix}${command} audio ${video.url}`, buttonText: { displayText: '🎧 𝘼𝙐𝘿𝙄𝙊' }, type: 1 },
            { buttonId: `${usedPrefix}${command} video ${video.url}`, buttonText: { displayText: '🎬 𝙑𝙄𝘿𝙀𝙊' }, type: 1 }
        ],
        headerType: 1,
        viewOnce: true
    }, { quoted: m });
};

handler.help = ['play <búsqueda>'];
handler.tags = ['descargas'];
handler.command = ['play'];
handler.register = true;

export default handler;
