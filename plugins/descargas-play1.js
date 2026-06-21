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
// Apuntamos directamente a tu nuevo endpoint híbrido/directo de Savenow
const API_SAVENOW = 'https://rest.apicausas.xyz/api/v1/descargas/youtubev2';

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

const handler = async (m, { conn, args, usedPrefix, command }) => {
    const tmpDir = './tmp';
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    args = args.filter(v => v?.trim());
    const isMode = ["audio", "video"].includes(args[0]?.toLowerCase());
    const type = isMode ? args[0].toLowerCase() : null;
    const query = isMode ? args.slice(1).join(" ") : args.join(" ");

    const sendEllenCard = async (text, imageUrl, buttons = []) => {
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

        const message = {
            viewOnceMessage: {
                message: {
                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                    interactiveMessage: proto.Message.InteractiveMessage.create(interactiveObj)
                }
            }
        };
        await conn.relayMessage(m.chat, message, { quoted: m });
    };

    if (!args[0]) {
        return await sendEllenCard(`*— (Bostezo)*... Dame algo que buscar.\n\n🎧 ᥱȷᥱm⍴ᥣ᥆:\n${usedPrefix}${command} *Linger*`, null); 
    }

    if (isMode) {
        await m.react(type === 'audio' ? "🎧" : "🎬");
        let finalUrl = null;

        // Intentar obtener el enlace procesado en tiempo real por Savenow
        try {
            const { data } = await axios.get(`${API_SAVENOW}?url=${encodeURIComponent(query)}&type=${type}&apikey=${API_KEY}`);
            
            // Estructura según tu router modificado (data.download.url)
            if (data.status && data.data?.download?.url) {
                finalUrl = data.data.download.url;
            }
        } catch (e) { 
            console.error("Error al obtener descarga de Savenow:", e.message); 
        }

        if (finalUrl) {
            try {
                if (type === 'audio') {
                    await conn.sendMessage(m.chat, { audio: { url: finalUrl }, mimetype: 'audio/mpeg', ptt: false }, { quoted: m });
                } else {
                    await conn.sendMessage(m.chat, { video: { url: finalUrl }, caption: `🎬 *Aquí tienes.*`, mimetype: "video/mp4" }, { quoted: m });
                }
                await m.react("✅");
            } catch (e) {
                console.error("Error enviando el archivo multimedia:", e.message);
                await m.react("❌");
            }
        } else {
            await m.react("❌");
            return conn.reply(m.chat, `*— Tsk...* El servidor de descargas Savenow no pudo procesar este flujo de inmediato.`, m);
        }
        return;
    }

    await m.react("🔍");
    const searchResult = await yts(query);
    const video = searchResult.videos?.[0];
    if (!video) return conn.reply(m.chat, `*— No encontré nada.*`, m);

    const caption = `₊‧꒰ 🦈 ꒱ 𝙀𝙇𝙇𝙀 N 𝙅𝙊𝙀 𝙎𝙀𝙍𝙑𝙄𝘾𝙀\n\n> *Título:* ${video.title}\n> *Uploader:* ${video.author.name}\n> *Duración:* ${video.timestamp}\n\n*— Elige si quieres audio o video.*`;
    const botonesNativos = [
        { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🎧 𝘼𝙐𝘿𝙄𝙊", id: `${usedPrefix}${command} audio ${video.url}` }) },
        { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🎬 𝙑𝙄𝘿𝙀𝙊", id: `${usedPrefix}${command} video ${video.url}` }) }
    ];

    await sendEllenCard(caption, video.thumbnail, botonesNativos);
};

handler.help = ['play <búsqueda>'];
handler.tags = ['descargas'];
handler.command = ['play'];
handler.register = true;

export default handler;
