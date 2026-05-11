import { exec } from 'child_process';
import fs from 'fs';
import axios from 'axios';
import yts from "yt-search";
import { promisify } from 'util';
import path from 'path';
import pkg from '@whiskeysockets/baileys';
const { prepareWAMessageMedia, proto } = pkg;

const execPromise = promisify(exec);
const API_BASE = 'https://rest.apicausas.xyz/api/v1/descargas/youtubev2';
const API_KEY = 'causa-ee5ee31dcfc79da4';

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

const handler = async (m, { conn, args, usedPrefix, command }) => {
    const tmpDir = './tmp';
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    args = args.filter(v => v?.trim());
    const isMode = ["audio", "video"].includes(args[0]?.toLowerCase());
    const type = isMode ? args[0].toLowerCase() : null;
    const query = isMode ? args.slice(1).join(" ") : args.join(" ");

    // --- LA EVOLUCIÓN: TARJETA INTERACTIVA NATIVA ---
    // Esto crea un bloque único con Imagen Gigante + Texto + Botones
    const sendEllenCard = async (text, imageUrl, buttons = []) => {
        // Preparamos la imagen para subirla a los servidores de Meta
        const mediaConfig = imageUrl ? { image: { url: imageUrl } } : { image: global.icons };
        const media = await prepareWAMessageMedia(mediaConfig, { upload: conn.waUploadToServer });

        const interactiveObj = {
            body: proto.Message.InteractiveMessage.Body.create({ text: text }),
            footer: proto.Message.InteractiveMessage.Footer.create({ text: "Victoria Housekeeping Service" }),
            header: proto.Message.InteractiveMessage.Header.create({
                title: "𝐄llen 𝐉ᴏ𝐄's 𝐒ervice 🦈",
                hasMediaAttachment: true,
                ...media // Inyectamos la imagen directamente en la cabecera
            }),
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 }
            }
        };

        // Si hay botones, los agregamos a la tarjeta
        if (buttons.length > 0) {
            interactiveObj.nativeFlowMessage = proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: buttons
            });
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

    // 1. Caso: Sin argumentos
    if (!args[0]) {
        const text = `*— (Bostezo)*... Dame algo que buscar.\n\n🎧 ᥱȷᥱm⍴ᥣ᥆:\n${usedPrefix}${command} *Linger*`;
        return await sendEllenCard(text, null); 
    }

    // 2. Caso: Descarga (Lógica API)
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
                    await conn.sendMessage(m.chat, { audio: fs.readFileSync(outputPath), mimetype: 'audio/mp4', fileName: `${title}.m4a`, ptt: false }, { quoted: m });
                } else {
                    await conn.sendMessage(m.chat, { video: { url: downloadUrl }, caption: `🎬 *Aquí tienes.*\n\n> *Contenido:* ${title}`, mimetype: "video/mp4" }, { quoted: m });
                }
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                await m.react("✅");
            }
        } catch (error) {
            await m.react("❌");
            return conn.reply(m.chat, `*— Tsk...* Algo salió mal.`, m);
        }
        return;
    }

    // 3. Caso: Búsqueda
    await m.react("🔍");
    const searchResult = await yts(query);
    const video = searchResult.videos?.[0];
    if (!video) return conn.reply(m.chat, `*— No encontré nada.*`, m);

    const caption = `₊‧꒰ 🦈 ꒱ 𝙀𝙇𝙇𝙀𝙉 𝙅𝙊𝙀 𝙎𝙀𝙍𝙑𝙄𝘾𝙀\n\n> *Título:* ${video.title}\n> *Uploader:* ${video.author.name}\n> *Duración:* ${video.timestamp}\n\n*— Elige si quieres audio o video.*`;

    // Botones con formato nativo (NativeFlow)
    const botonesNativos = [
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({ display_text: "🎧 𝘼𝙐𝘿𝙄𝙊", id: `${usedPrefix}${command} audio ${video.url}` })
        },
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({ display_text: "🎬 𝙑𝙄𝘿𝙀𝙊", id: `${usedPrefix}${command} video ${video.url}` })
        }
    ];

    // Enviamos TODO en una sola tarjeta masiva
    await sendEllenCard(caption, video.thumbnail, botonesNativos);
};

handler.help = ['play <búsqueda>'];
handler.tags = ['descargas'];
handler.command = ['play'];
handler.register = true;

export default handler;
