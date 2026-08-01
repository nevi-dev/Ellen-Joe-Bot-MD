import db from '../database.js'
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

// Function to shorten URLs (retained from original)
async function getShortUrl(longUrl) {
    try {
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
        return response.data;
    } catch (error) {
        console.error('Error shortening link:', error.message);
        return longUrl;
    }
}

// Function to get anime episodes (retained from original)
async function getAnimeEpisodes(url) {
    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);

        const script = $('script').filter((i, el) => {
            const text = $(el).text();
            return text.includes('var anime_info') && text.includes('var episodes');
        });

        if (script.length === 0) {
            throw new Error('No se encontró el script que contiene las variables necesarias. La estructura del sitio puede haber cambiado.');
        }

        const scriptText = script.html();
        const animeInfoMatch = scriptText.match(/var anime_info = (\[.*?\]);/);
        const episodesMatch = scriptText.match(/var episodes = (\[.*?\]);/);

        if (!animeInfoMatch || !episodesMatch) {
            throw new Error('No se encontraron las variables anime_info o episodes en el script. La estructura del sitio puede haber cambiado.');
        }

        const animeInfo = JSON.parse(animeInfoMatch[1]);
        const episodes = JSON.parse(episodesMatch[1]);

        const animeId = animeInfo[1];

        // Ensure episodes are processed correctly, handling potential empty arrays
        const episodeUrls = episodes.reverse().map((episode, index) => ({
            [`Episodio ${index + 1}`]: `https://tioanime.com/ver/${animeId}-${episode}`
        }));

        const nextEpisodeElement = $('span.next-episode span');
        const nextEpisode = nextEpisodeElement.text().trim() || 'N/A'; // Use .trim() for cleaner text

        return {
            proximo_episodio: nextEpisode,
            episodios: episodeUrls
        };
    } catch (error) {
        console.error('Error al obtener los episodios:', error.message);
        return { error: `⚠️ *Error en el protocolo de extracción, Proxy.* No pude obtener los detalles del anime. Verifica la URL o informa de la anomalía.\nDetalles: ${error.message}` };
    }
}

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
        return m.replyExternal(`🦈 *Rastro frío, Proxy ${name}.* Necesito la URL del anime para iniciar la extracción de información.`, { contextInfo });
    }

    // Checking for premium status
    let user = db.data.users[m.sender];
    if (!user.premium) {
        return m.replyExternal(`⧼✦⧽ *Acceso Restringido, Proxy ${name}.*\nEl protocolo *${usedPrefix + command}* solo está disponible para usuarios con autorización de *Nivel Élite*.`, { contextInfo });
    }

    m.react('🔄'); // Reaction for processing
    m.replyExternal(`🔄 *Iniciando protocolo de análisis de anime, Proxy ${name}.* Aguarda, la decodificación de episodios está en curso.`, { contextInfo });

    try {
        let data = await getAnimeEpisodes(args[0]);

        if (data.error) {
            await m.react('❌'); // Error reaction
            return m.replyExternal(data.error, { contextInfo });
        }

        let messageText = `╭━━━━[ 𝙰𝚗𝚒𝚖𝚎 𝙳𝚎𝚌𝚘𝚍𝚎𝚍: 𝙳𝚎𝚝𝚊𝚕𝚕𝚎𝚜 𝚍𝚎 𝙴𝚙𝚒𝚜𝚘𝚍𝚒𝚘 ]━━━━⬣\n`;
        
        if (data.episodios && data.episodios.length > 0) {
            messageText += `• *Lista de Episodios:* \n`;
            for (const episode of data.episodios) {
                const [key, url] = Object.entries(episode)[0];
                const shortUrl = await getShortUrl(url); // Shorten each episode URL
                messageText += `  ${key}:\n  🔗 *URL:* ${shortUrl}\n─ׄ─ׄ─⭒─ׄ─ׅ─ׄ⭒─ׄ─ׄ─⭒─ׄ─ׄ─⭒─ׄ─ׅ─\n`;
            }
        } else {
            messageText += `• *No se encontraron episodios disponibles para esta serie.* \n`;
        }
        
        messageText += `\n📺 *Próximo Episodio Registrado:* ${data.proximo_episodio}\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`;

        await conn.sendMessage(m.chat, { text: messageText }, { quoted: m });
        await m.react('✅'); // Success reaction

    } catch (error) {
        console.error("Error general al procesar animeinfo:", error);
        await m.react('❌'); // Error reaction
        m.replyExternal(`⚠️ *Anomalía crítica en la operación, Proxy ${name}.*\nNo pude completar la extracción de información del anime. Verifica la URL o informa del error.\nDetalles: ${error.message}`, { contextInfo });
    }
}

handler.help = ['animeinfo <url>'];
handler.command = ['animeinfo', 'animei'];
handler.tags = ['descargas'];
handler.premium = true;
handler.register = true;
handler.group = true;

export default handler;
