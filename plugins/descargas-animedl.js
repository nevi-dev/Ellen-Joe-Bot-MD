/*
- Coded by I'm Fz
- https/Github.com/FzTeis
- Enhanced by Ellen Joe's Service
*/

import axios from 'axios';
import cheerio from 'cheerio';

// --- Constantes y Configuración de Transmisión (Estilo Ellen Joe) ---
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

// Function to shorten URLs (retained from original, but moved for clarity)
async function acc(longUrl) {
    try {
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
        return response.data;
    } catch (error) {
        console.error('Error shortening link:', error.message);
        return longUrl;
    }
}

// Function to get download links (retained from original)
const getDownloadLinks = async (url) => {
    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);
        const downloads = {};
        $('table.table-downloads tbody tr').each((_, element) => {
            const server = $(element).find('td:nth-child(2)').text().trim();
            const link = $(element).find('td:nth-child(4) a').attr('href');
            if (server && link) {
                downloads[server] = link;
            }
        });
        return downloads;
    } catch (error) {
        console.error('Error processing URL:', url, error.message);
        return { error: 'Failed to retrieve links. The target might be offline or the link is invalid.' };
    }
};

let handler = async (m, { conn, command, args, text, usedPrefix }) => {
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

    if (!args[0]) {
        return conn.reply(
            m.chat,
            `🦈 *Rastro frío, Proxy ${name}.* Necesito la URL del anime para iniciar la extracción de enlaces.\n\n_Ejemplo: ${usedPrefix + command} [tu_link_de_anime_aquí]_\n\n*Nota:* Los enlaces del comando #animes a veces son acortados debido a su longitud, pero son funcionales.`,
            m,
            { contextInfo, quoted: m }
        );
    }

    // Checking for premium status, assuming global.db.data.users is accessible.
    let user = global.db.data.users[m.sender];
    if (!user.premium) {
        return m.replyExternal(`⧼✦⧽ *Acceso Restringido, Proxy ${name}.*\nEl protocolo *${usedPrefix + command}* solo está disponible para usuarios con autorización de *Nivel Élite*.`, { contextInfo });
    }

    m.react('🔄'); // Reaction for processing
    conn.reply(
        m.chat,
        `🔄 *Iniciando protocolo de extracción de enlaces de anime, Proxy ${name}.* Aguarda, la decodificación está en curso.`,
        m,
        { contextInfo, quoted: m }
    );

    try {
        const links = await getDownloadLinks(args[0]);

        if (links.error) {
            await m.react('❌'); // Error reaction
            return m.replyExternal(`❌ *Fallo en la extracción, Proxy ${name}.*\n${links.error}. Verifica el enlace o informa de la anomalía.`, { contextInfo });
        }

        let messageText = `╭━━━━[ 𝙰𝚗𝚒𝚖𝚎 𝙳𝚎𝚌𝚘𝚍𝚎𝚍: 𝙴𝚗𝚕𝚊𝚌𝚎𝚜 𝙰𝚜𝚎𝚐𝚞𝚛𝚊𝚍𝚘𝚜 ]━━━━⬣\n`;
        let linkCount = 0;

        for (const [server, link] of Object.entries(links)) {
            if (link) { // Ensure the link is not null/undefined
                messageText += `💻 *Servidor:* ${server}\n  🔗 *\`Enlace:\`* ${link}\n─ׄ─ׄ─⭒─ׄ─ׅ─ׄ⭒─ׄ─ׄ─⭒─ׄ─ׄ─⭒─ׄ─ׅ─\n`;
                linkCount++;
            }
        }

        if (linkCount === 0) {
            await m.react('❌');
            return m.replyExternal(`❌ *Fallo en la extracción, Proxy ${name}.*\nNo se encontraron enlaces de descarga válidos para esta URL.`, { contextInfo });
        }

        messageText += `\n*Nota:* Los enlaces antiguos podrían estar inactivos. Procede con precaución, Proxy.\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`;

        await conn.sendMessage(m.chat, { text: messageText }, { quoted: m });
        await m.react('✅'); // Success reaction

    } catch (error) {
        console.error("Error al procesar enlaces de anime:", error);
        await m.react('❌'); // Error reaction
        m.replyExternal(`⚠️ *Anomalía crítica en la operación, Proxy ${name}.*\nNo pude completar la extracción de enlaces. Verifica la URL o informa del error.\nDetalles: ${error.message}`, { contextInfo });
    }
}

handler.help = ['animedl <url>'];
handler.command = ['animedl', 'animelinks'];
handler.tags = ['descargas'];
// The original code had handler.premium commented out, but the if statement checks for it.
// Uncommenting it here to match the logic, or remove the if statement if it's meant for everyone.
handler.premium = true; // Assuming this should be active based on the 'if' condition
handler.group = true;
handler.register = true;
handler.coin = 5;

export default handler;
