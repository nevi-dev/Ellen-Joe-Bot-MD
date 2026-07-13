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

// Apuntamos al nuevo endpoint v3
const API_SAVENOW = 'https://rest.apicausas.xyz/api/v3/descargas/YouTube';

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

// Función auxiliar para obtener el peso del archivo usando GET y Streams (Sin head)
const getFileSize = async (url) => {
    try {
        const response = await axios.get(url, { responseType: 'stream' });
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

const handler = async (m, { conn, args, usedPrefix, command }) => {
    const tmpDir = './tmp';
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    args = args.filter(v => v?.trim());
    const isMode = ["audio", "video"].includes(args[0]?.toLowerCase());
    const type = isMode ? args[0].toLowerCase() : null;
    const query = isMode ? args.slice(1).join(" ") : args.join(" ");

    const name = await conn.getName(m.sender);
    const matchedUrl = 'https://github.com/nevi-dev';

    // Generar Buffer para la imagen de Ellen
    let thumbnailBuffer;
    try {
        thumbnailBuffer = Buffer.isBuffer(global.icons)
            ? global.icons
            : (fs.existsSync(global.icons) ? fs.readFileSync(global.icons) : Buffer.from(global.icons, 'base64'));
    } catch (e) {
        thumbnailBuffer = Buffer.alloc(0);
    }

    // Nueva función para enviar el mensaje de vista previa (Shadow)
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

    // Función de botones nativos para enviar la tarjeta interactiva de resultados
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

    // --- Lógica Principal --- //

    // Si el usuario solo pone ".play" sin argumentos, usamos tu nueva función Shadow
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
                
                // Obtener el peso usando nuestro GET stream sin descargar el archivo
                fileSize = await getFileSize(finalUrl);
            }
        } catch (e) { 
            console.error("Error al obtener descarga de Savenow v3:", e.message); 
        }

        if (finalUrl) {
            try {
                if (type === 'audio') {
                    await conn.sendMessage(m.chat, { audio: { url: finalUrl }, mimetype: 'audio/mpeg', ptt: false }, { quoted: m });
                } else {
                    const videoCaption = `🎬 *Aquí tienes.*\n\n> *Título:* ${fileTitle}\n> *Calidad:* ${fileQuality}\n> *Peso:* ${fileSize}`;
                    await conn.sendMessage(m.chat, { video: { url: finalUrl }, caption: videoCaption, mimetype: "video/mp4" }, { quoted: m });
                }
                await m.react("✅");
            } catch (e) {
                console.error("Error enviando el archivo multimedia:", e.message);
                await m.react("❌");
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
    
    // Usamos botones interactivos reales aquí para que puedan hacer clic a AUDIO o VIDEO
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
