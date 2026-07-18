import { File } from "megajs";
import path from "path";

// --- Constantes y Configuración de Transmisión (Estilo Ellen Joe) ---
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏᴇ\'s 𝐒ervice';

let handler = async (m, { conn, args, usedPrefix, text, command }) => {
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

    try {
        if (!text) {
            return m.replyExternal(`🦈 *Rastro frío, Proxy ${name}.* Necesito un identificador de archivo de MEGA para proceder.\n\n_Ejemplo: ${usedPrefix + command} [tu_enlace_MEGA_aquí]`, { contextInfo });
        }

        const file = File.fromURL(text);
        await file.loadAttributes();

        // Considerando el límite de 300MB
        if (file.size >= 300000000) {
            return m.replyExternal(`⚠️ *Carga excesiva, Proxy ${name}.*\nEl archivo (${formatBytes(file.size)}) es demasiado grande para la transmisión estándar. Límite: 300MB.`, { contextInfo });
        }

        m.react('🔄'); // Emoticono de procesamiento

        const caption = `
╭━━━━[ 𝙼𝙴𝙶𝙰 𝙳𝚎𝚌𝚘𝚍𝚎𝚍: 𝙲𝚊𝚛𝚐𝚊 𝙰𝚜𝚎𝚐𝚞𝚛𝚊𝚍𝚊 ]━━━━⬣
📦 *Designación de Archivo:* ${file.name}
📏 *Tamaño de Carga:* ${formatBytes(file.size)}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`;

        const data = await file.downloadBuffer();

        const fileExtension = path.extname(file.name).toLowerCase();
        const mimeTypes = {
            ".mp4": "video/mp4",
            ".pdf": "application/pdf",
            ".zip": "application/zip",
            ".rar": "application/x-rar-compressed",
            ".7z": "application/x-7z-compressed",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".mp3": "audio/mpeg", // Añadido para mayor compatibilidad
            ".ogg": "audio/ogg",
            ".webp": "image/webp",
            ".txt": "text/plain",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        };

        let mimetype = mimeTypes[fileExtension] || "application/octet-stream";

        await conn.sendFile(m.chat, data, file.name, caption, m, null, { mimetype, asDocument: true });

    } catch (error) {
        console.error("Error al procesar MEGA:", error);
        return m.replyExternal(`❌ *Anomalía crítica, Proxy ${name}.*\nNo pude asegurar la carga desde MEGA. Verifica el enlace o intenta de nuevo.\nDetalles: ${error.message}`, { contextInfo });
    }
}

handler.help = ["mega"];
handler.tags = ["descargas"];
handler.command = ['mega', 'mg'];
handler.group = true;
handler.register = true;
handler.coin = 5;

export default handler;

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
