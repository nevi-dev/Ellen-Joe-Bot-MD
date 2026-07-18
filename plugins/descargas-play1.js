import { exec } from 'child_process';
import fs from 'fs';
import axios from 'axios';
import yts from "yt-search";
import { promisify } from 'util';
import path from 'path';

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

// Función modificada para soportar cancelación inmediata (AbortSignal) con Pipe continuo
const downloadMedia = async (url, filepath, signal) => {
    const writer = fs.createWriteStream(filepath);
    try {
        const response = await axios.get(url, {
            responseType: 'stream',
            headers: requestHeaders,
            signal: signal
        });
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            const cleanupAndReject = (err) => {
                writer.close();
                if (fs.existsSync(filepath)) {
                    try { fs.unlinkSync(filepath); } catch {}
                }
                reject(err);
            };

            writer.on('finish', () => resolve(filepath));
            writer.on('error', cleanupAndReject);

            if (signal) {
                if (signal.aborted) return cleanupAndReject(new Error('Descarga abortada por el sistema en paralelo'));
                signal.addEventListener('abort', () => {
                    cleanupAndReject(new Error('Descarga abortada por el sistema en paralelo'));
                });
            }
        });
    } catch (error) {
        writer.close();
        if (fs.existsSync(filepath)) {
            try { fs.unlinkSync(filepath); } catch {}
        }
        throw error;
    }
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

    const sendExternalMessage = (msgText, options = {}) => m.replyExternal(msgText, options)

    const sendInteractiveCard = async (text, imageUrl, buttons = []) => {
        const nativeFlow = buttons.map((button, index) => {
            const params = button?.buttonParamsJson ? JSON.parse(button.buttonParamsJson) : {}
            if (button?.name === 'cta_url') return { text: params.display_text || `Abrir ${index + 1}`, url: params.url || params.merchant_url }
            return { text: params.display_text || `Opción ${index + 1}`, id: params.id || params.rowId || `${usedPrefix}${command}` }
        }).filter((button) => button.text && (button.url || button.id))

        await conn.sendMessage(m.chat, {
            image: imageUrl ? { url: imageUrl } : global.icons,
            caption: text,
            title: "𝐄llen 𝐉ᴏ𝐄's 𝐒ervice 🦈",
            footer: 'Victoria Housekeeping Service',
            nativeFlow,
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 }
            }
        }, { quoted: m });
    };

    if (!args[0]) {
        return await sendExternalMessage(`*— (Bostezo)*... Dame algo que buscar.\n\n🎧 ᥱȷᥱm⍴ᥣ᥆:\n${usedPrefix}${command} *Linger*`);
    }

    if (isMode) {
        await m.react(type === 'audio' ? "🎧" : "🎬");

        const ext = type === 'audio' ? 'mp3' : 'mp4';
        const mediaPathV3 = path.join(tmpDir, `${Date.now()}_v3.${ext}`);
        const mediaPathV2 = path.join(tmpDir, `${Date.now()}_v2.${ext}`);

        // Controladores para poder cancelar la API perdedora de golpe
        const controllerV3 = new AbortController();
        const controllerV2 = new AbortController();

        // Configuración de parámetros para API V3
        const configV3 = {
            url: API_SAVENOW,
            params: { url: query, type: type, quality: type === 'video' ? '360' : '320', apikey: API_KEY },
            targetQuality: type === 'video' ? '360' : '320'
        };

        // Configuración de parámetros para API V2
        const configV2 = {
            url: 'https://rest.apicausas.xyz/api/v2/descargas/youtube',
            params: { apikey: API_KEY, url: query, type: type },
            targetQuality: type === 'video' ? '360' : '320'
        };
        if (type === 'video') configV2.params.quality = '360'; // Solo añade quality si es video

        let won = false;

        // Pipeline individual para procesar, descargar y competir en paralelo
        const runPipeline = async (version, config, mediaPath, myController, otherController) => {
            const response = await axios.get(config.url, {
                params: config.params,
                headers: requestHeaders,
                signal: myController.signal
            });

            if (!response.data || !response.data.status || !response.data.data?.download?.url) {
                throw new Error(`API ${version} no entregó enlaces válidos.`);
            }

            const finalUrl = response.data.data.download.url;
            const fileTitle = response.data.data.title || "Archivo";
            const fileQuality = response.data.data.quality || config.targetQuality;

            // Empieza la descarga física por streams vía Pipe
            await downloadMedia(finalUrl, mediaPath, myController.signal);

            // Doble verificación por si la otra API terminó exactamente al mismo milisegundo
            if (won) {
                if (fs.existsSync(mediaPath)) try { fs.unlinkSync(mediaPath); } catch {}
                throw new Error(`La API ${version} llegó tarde.`);
            }

            won = true;
            otherController.abort(); // ¡Bum! Cancela la otra API y destruye su descarga en proceso

            // Consultar peso tras ganar si la API no lo mandó listo
            const fileSize = response.data.data.size || await getFileSize(finalUrl);

            return { version, mediaPath, fileTitle, fileQuality, fileSize };
        };

        const tasks = [
            runPipeline('v3', configV3, mediaPathV3, controllerV3, controllerV2),
            runPipeline('v2', configV2, mediaPathV2, controllerV2, controllerV3)
        ];

        let winner = null;
        try {
            // Estructura de carrera controlada: si una falla rápido, la otra sigue viva hasta terminar
            winner = await new Promise((resolve, reject) => {
                let errors = 0;
                tasks.forEach(p => {
                    p.then(resolve).catch(err => {
                        errors++;
                        if (errors === tasks.length) {
                            reject(new Error('Ambos servidores fallaron en procesar el archivo.'));
                        }
                    });
                });
            });
        } catch (e) {
            console.error("Error en carrera paralela:", e.message);
        }

        if (winner) {
            try {
                if (type === 'audio') {
                    await conn.sendMessage(m.chat, { audio: { url: winner.mediaPath }, mimetype: 'audio/mpeg', ptt: false }, { quoted: m });
                } else {
                    const videoCaption = `🎬 *Aquí tienes.*\n\n> *Título:* ${winner.fileTitle}\n> *Calidad:* ${winner.fileQuality}\n> *Peso:* ${winner.fileSize}\n> *Servidor:* ${winner.version.toUpperCase()}`;
                    await conn.sendMessage(m.chat, { video: { url: winner.mediaPath }, caption: videoCaption, mimetype: "video/mp4" }, { quoted: m });
                }
                await m.react("✅");
            } catch (e) {
                console.error("Error al enviar el archivo definitivo:", e.message);
                await m.react("❌");
            }
        } else {
            await m.react("❌");
            return await sendExternalMessage(`*— Tsk...* Ninguno de los servidores pudo procesar el enlace en este momento. Intenta de nuevo.`);
        }

        // Limpieza absoluta de seguridad para que no queden residuos en ./tmp
        [mediaPathV3, mediaPathV2].forEach(p => {
            if (fs.existsSync(p)) {
                try { fs.unlinkSync(p); } catch {}
            }
        });
        return;
    }

    await m.react("🔍");
    const searchResult = await yts(query);
    const video = searchResult.videos?.[0];

    if (!video) return await sendExternalMessage(`*— No encontré nada con ese nombre.*`);

    const caption = `₊‧꒰ 🦈 ꒱ 𝙀𝙇𝙇𝙀 N 𝙅𝙊𝙀 𝙎𝙀𝙍𝙑𝙄𝘾𝙀\n\n> *Título:* ${video.title}\n> *Uploader:* ${video.author.name}\n> *Duración:* ${video.timestamp}\n\n*— Elige si quieres audio o video.*`;

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
