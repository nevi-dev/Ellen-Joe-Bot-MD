import { exec } from 'child_process';
import fs from 'fs';
import axios from 'axios';
import yts from "yt-search";
import { promisify } from 'util';
import path from 'path';
import pkg from '@whiskeysockets/baileys';
const { prepareWAMessageMedia, proto } = pkg;

const execPromise = promisify(exec);
const API_KEY = 'causa-ee5ee31dcfc79da4';
const API_SAVENOW = 'https://rest.apicausas.xyz/api/v3/descargas/YouTube';

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

// Cabeceras para simular que somos un navegador y evitar el Error 403
const requestHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*'
};

// Función auxiliar para obtener el peso del archivo
const getFileSize = async (url) => {
    try {
        const response = await axios.get(url, { 
            responseType: 'stream', 
            headers: requestHeaders 
        });
        const bytes = response.headers['content-length'];
        response.data.destroy(); // Cancelar la descarga
        if (bytes) {
            const mb = (bytes / (1024 * 1024)).toFixed(2);
            return `${mb} MB`;
        }
    } catch (e) {
        console.error("No se pudo leer el tamaño del archivo:", e.message);
    }
    return 'Desconocido';
};

// Función auxiliar para descargar el archivo temporalmente y evitar el 403 de Baileys
const downloadMedia = async (url, filepath) => {
    const writer = fs.createWriteStream(filepath);
    const response = await axios.get(url, {
        responseType: 'stream',
        headers: requestHeaders
    });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filepath));
        writer.on('error', reject);
    });
};

const handler = async (m, { conn, args, usedPrefix, command }) => {
    const tmpDir = './tmp';
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    args = args.filter(v => v?.trim());
    const isMode = ["audio", "video"].includes(args[0]?.toLowerCase());
    const type = isMode ? args[0].toLowerCase() : null;
    const query = isMode ? args.slice(1).join(" ") : args.join(" ");

    const name = await conn.getName(m.sender);
    const matchedUrl = 'https://github.com/nevi-dev';

    let thumbnailBuffer;
    try {
        thumbnailBuffer = Buffer.isBuffer(global.icons)
            ? global.icons
            : (fs.existsSync(global.icons) ? fs.readFileSync(global.icons) : Buffer.from(global.icons, 'base64'));
    } catch (e) {
        thumbnailBuffer = Buffer.alloc(0);
    }

    const sendExternalMessage = async (msgText) => {
        await conn.relayMessage(m.chat, {
            extendedTextMessage: {
                text: `${matchedUrl}\n\n${msgText}`,
                matchedText: matchedUrl,
                canonicalUrl: matchedUrl,
                title: '🦈 𝙑𝙄𝘾𝙏𝙊𝙍𝙄𝘼 𝙃𝙊𝙐𝙎𝙀𝙆𝙀𝙀𝙋𝙄𝙉𝙂', 
                description: `✦ ¿Necesitas algo, ${name}? Date prisa...`,
                previewType: 'shadow',
                jpegThumbnail: thumbnailBuffer,
                contextInfo: {
                    quotedMessage: m.message,
                    participant: m.sender,
                    stanzaId: m.id,
                    remoteJid: m.chat,
                    isForwarded: true,
                    forwardingScore: 999,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid,
                        newsletterName,
                        serverMessageId: -1
                    }
                }
            }
        }, { quoted: m });
    };

    const sendInteractiveCard = async (text, imageUrl, buttons = []) => {
        const mediaConfig = imageUrl ? { image: { url: imageUrl } } : { image: global.icons };
        const media = await prepareWAMessageMedia(mediaConfig, { upload: conn.waUploadToServer });

        const interactiveObj = {
            body: proto.Message.InteractiveMessage.Body.create({ text: text }),
            footer: proto.Message.InteractiveMessage.Footer.create({ text: "Victoria Housekeeping Service" }),
            header: proto.Message.InteractiveMessage.Header.create({
                title: "𝐄llen 𝐉ᴏ𝐄's 𝐒ervice 🦈",
                hasMediaAttachment: true,
                ...media
            }),
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 }
            }
        };

        if (buttons.length > 0) {
            interactiveObj.nativeFlowMessage = proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons: buttons });
        }

        const message = { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 }, interactiveMessage: proto.Message.InteractiveMessage.create(interactiveObj) } } };
        await conn.relayMessage(m.chat, message, { quoted: m });
    };

    if (!args[0]) {
        return await sendExternalMessage(`*— (Bostezo)*... Dame algo que buscar.\n\n🎧 ᥱȷᥱm⍴ᥣ᥆:\n${usedPrefix}${command} *Linger*`);
    }

    if (isMode) {
        await m.react(type === 'audio' ? "🎧" : "🎬");
        let finalUrl = null;
        let fileTitle = "Archivo";
        let fileQuality = "";
        let fileSize = "Desconocido";
        const targetQuality = type === 'video' ? '360' : '320';

        try {
            const { data } = await axios.get(API_SAVENOW, {
                params: { url: query, type: type, quality: targetQuality, apikey: API_KEY }
            });
            
            if (data.status && data.data?.download?.url) {
                finalUrl = data.data.download.url;
                fileTitle = data.data.title || fileTitle;
                fileQuality = data.data.quality || targetQuality;
                
                // Intentamos buscar el peso si la API lo envía de fábrica, si no, lo consultamos con headers
                fileSize = data.data.size || await getFileSize(finalUrl);
            }
        } catch (e) { 
            console.error("Error al obtener descarga de Savenow v3:", e.message); 
        }

        if (finalUrl) {
            let mediaPath = '';
            try {
                // 1. Descargamos el archivo localmente para usar nuestros propios headers y evadir el 403
                const ext = type === 'audio' ? 'mp3' : 'mp4';
                mediaPath = path.join(tmpDir, `${Date.now()}.${ext}`);
                await downloadMedia(finalUrl, mediaPath);

                // 2. Enviamos el archivo local
                if (type === 'audio') {
                    await conn.sendMessage(m.chat, { audio: { url: mediaPath }, mimetype: 'audio/mpeg', ptt: false }, { quoted: m });
                } else {
                    const videoCaption = `🎬 *Aquí tienes.*\n\n> *Título:* ${fileTitle}\n> *Calidad:* ${fileQuality}\n> *Peso:* ${fileSize}`;
                    await conn.sendMessage(m.chat, { video: { url: mediaPath }, caption: videoCaption, mimetype: "video/mp4" }, { quoted: m });
                }
                await m.react("✅");
            } catch (e) {
                console.error("Error enviando el archivo multimedia:", e.message);
                await m.react("❌");
            } finally {
                // 3. Borramos el archivo una vez enviado para ahorrar memoria en el bot
                if (mediaPath && fs.existsSync(mediaPath)) {
                    fs.unlinkSync(mediaPath);
                }
            }
        } else {
            await m.react("❌");
            return await sendExternalMessage(`*— Tsk...* El servidor no pudo procesar el enlace. Prueba con otro.`);
        }
        return;
    }

    await m.react("🔍");
    const searchResult = await yts(query);
    const video = searchResult.videos?.[0];
    
    if (!video) return await sendExternalMessage(`*— No encontré nada con ese nombre.*`);

    const caption = `₊‧꒰ 🦈 ꒱ 𝙀𝙇𝙇𝙀𝙉 𝙅𝙊𝙀 𝙎𝙀𝙍𝙑𝙄𝘾𝙀\n\n> *Título:* ${video.title}\n> *Uploader:* ${video.author.name}\n> *Duración:* ${video.timestamp}\n\n*— Elige si quieres audio o video.*`;
    
    const botonesNativos = [
        { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🎧 𝘼𝙐𝘿𝙄𝙊", id: `${usedPrefix}${command} audio ${video.url}` }) },
        { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🎬 𝙑𝙄𝘿𝙀𝙊", id: `${usedPrefix}${command} video ${video.url}` }) }
    ];

    await sendInteractiveCard(caption, video.thumbnail, botonesNativos);
};

handler.help = ['play <búsqueda>'];
handler.tags = ['descargas'];
handler.command = ['play'];
handler.register = true;

export default handler;
