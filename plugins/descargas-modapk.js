import { search, download } from 'aptoide-scraper';

// --- Constantes y Configuración de Transmisión (Estilo Ellen Joe) ---
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

var handler = async (m, { conn, usedPrefix, command, text }) => {
    const name = conn.getName(m.sender); // Identifying the Proxy

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

    if (!text) {
        return conn.reply(
            m.chat,
            `🦈 *Rastro frío, Proxy ${name}.* Necesito la designación de la APK para iniciar la extracción.\n\n_Example: ${usedPrefix + command} whatsapp_`,
            m,
            { contextInfo, quoted: m }
        );
    }

    try {
        await m.react('🔄'); // Processing reaction
        conn.reply(
            m.chat,
            `🔄 *Iniciando protocolo de extracción Aptoide, Proxy ${name}.* Aguarda, la carga está siendo procesada.`,
            m,
            { contextInfo, quoted: m }
        );

        let searchA = await search(text);
        if (!searchA || searchA.length === 0) {
            return conn.reply(
                m.chat,
                `❌ *Fallo en la extracción Aptoide, Proxy ${name}.*\nNo se encontraron resultados para "${text}". Verifica la designación.`,
                m,
                { contextInfo, quoted: m }
            );
        }

        let data5 = await download(searchA[0].id);
        if (!data5 || !data5.dllink) {
            return conn.reply(
                m.chat,
                `❌ *Fallo en la extracción Aptoide, Proxy ${name}.*\nNo se pudo obtener el enlace de descarga para "${searchA[0].name}".`,
                m,
                { contextInfo, quoted: m }
            );
        }

        const fileSizeMB = parseFloat(data5.size.replace(' MB', ''));
        const isTooHeavy = data5.size.includes('GB') || (data5.size.includes('MB') && fileSizeMB > 999);

        let caption = `
╭━━━━[ 𝙰𝚙𝚝𝚘𝚒𝚍𝚎 𝙳𝚎𝚌𝚘𝚍𝚎𝚍: 𝙲𝚊𝚛𝚐𝚊 𝙰𝙿𝙺 𝙰𝚜𝚎𝚐𝚞𝚛𝚊𝚍𝚊 ]━━━━⬣
☁️ *Designación:* ${data5.name}
🔖 *Identificador de Paquete:* ${data5.package}
🚩 *Última Transmisión:* ${data5.lastup}
⚖ *Tamaño de Carga:* ${data5.size}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`;

        await conn.sendFile(m.chat, data5.icon, 'thumbnail.jpg', caption, m, null, { contextInfo, quoted: m });

        if (isTooHeavy) {
            return conn.reply(
                m.chat,
                `⚠️ *Carga excesiva, Proxy ${name}.*\nEl archivo (${data5.size}) es demasiado grande para la transmisión estándar. Se requiere autorización de Nivel Élite para cargas de este volumen.`,
                m,
                { contextInfo, quoted: m }
            );
        }

        await conn.sendMessage(
            m.chat,
            {
                document: { url: data5.dllink },
                mimetype: 'application/vnd.android.package-archive',
                fileName: data5.name + '.apk',
                caption: null // Caption is sent with the thumbnail, no need here.
            },
            { quoted: m }
        );
        m.react('✅'); // Success reaction

    } catch (error) {
        console.error("Error processing Aptoide:", error);
        conn.reply(
            m.chat,
            `❌ *Anomalía crítica en la operación Aptoide, Proxy ${name}.*\nNo pude completar la extracción. Verifica los parámetros o informa del error.\nDetalles: ${error.message}`,
            m,
            { contextInfo, quoted: m }
        );
        m.react('❌'); // Failure reaction
    }
}

handler.tags = ['descargas'];
handler.help = ['apkmod'].map(v => v + ' <app_name>');
handler.command = ['apk', 'modapk', 'aptoide'];
handler.group = true;
handler.register = true;
handler.coin = 5;

export default handler;
