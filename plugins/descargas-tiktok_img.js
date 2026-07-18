// Coded by KenisawaDev
// ======================

import axios from 'axios';
import cheerio from 'cheerio';

// --- Constantes y Configuración de Transmisión (Estilo Ellen Joe) ---
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

let handler = async (m, { conn, text, args, command, usedPrefix }) => {
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
        return m.replyExternal(`🦈 *Rastro frío, Proxy ${name}.* Necesito la URL de una imagen de TikTok para iniciar la extracción.`, { contextInfo });
    }

    let mainUrl = `https://dlpanda.com/id?url=${text}&token=G7eRpMaa`;
    let backupUrl = `https://dlpanda.com/id?url=${text}&token51=G32254GLM09MN89Maa`; // Consider if this backup is still necessary/valid
    let creator = 'KenisawaDev'; // Keeping original creator info

    conn.sendMessage(m.chat, { react: { text: "🔄", key: m.key } }); // Changed emoji to '🔄' for consistency
    m.replyExternal(`🔄 *Iniciando protocolo de extracción de imágenes de TikTok, Proxy ${name}.* Aguarda, la carga visual está siendo procesada.`, { contextInfo });

    try {
        let response = await axios.get(mainUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/117.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'id,en-US;q=0.7,en;q=0.3',
                'Accept-Encoding': 'gzip, deflate, br',
                'Alt-Used': 'dlpanda.com',
                'Connection': 'keep-alive',
                // WARNING: Directly copying cookies from a browser session can lead to issues.
                // These are likely tied to a specific session and might expire or cause CAPTCHAs.
                // For a robust solution, consider using an API key from dlpanda or a different method
                // that doesn't rely on session-specific cookies.
                'Cookie': 'cf_clearance=vdZS2yhltq5vorBBw7wPwGOxaRBiCANmFWRdAqKLlmI-1693612801-0-1-ab4b189c.e21c5b7c.f700a2ea-0.2.1693612801; _ga_DQ96ZJ6QXK=GS1.1.1693612800.2.1.1693612814.0.0.0; _ga=GA1.1.1626490340.1693347388; current_locale=id; __gads=ID=390b63a593862513-22debbc32ce300d7:T=1693347389:RT=1693612802:S=ALNI_Mbez6jYLnaF45LqwcUZR564jwrLgw; __gpi=UID=00000c3691b8b508:T=1693347389:RT=1693612802:S=ALNI_Ma03oA0UzqNgAsE2_fXRpT1NKg_Kw; fpestid=2g_N1gPYC68duNfJozpD093K-4zaMANBzHKNlh7x3Hg3XsGiN8TdNDAu6-MclRzqfUtePw; XSRF-TOKEN=eyJpIjoicUZtV0RJangwQXo2ZFZwZndxd1ZZck85OFMwWE9Edzg0ZnFUZXBGRzNVczNHeVpXbjFKdWhZQUFOZTBTZWRMUUN4Um1COVNDY3JRN1ZkWm5DUklseUlWTUNMc0huNkR1TjlZY2dpZUlPNExOcy9TbkNCeXNVTE50ZFgvSTkzelgiLCJpdiI6Ikd0ekE2VEdETkowRTh4OVYyU2ljeGc9PSIsInZhbHVlIjoicUZtV0RJangwQXo2ZFZwZndxd1ZZck85OFMwWE9Edzg0ZnFUZXBGRzNVczNHeVpXbjFKdWhZQUFOZTBTZWRMUUN4Um1COVNDY3JRN1ZkWm5DUklseUlWTUNNc0huNkR1TjlZY2dpZUlPNExOcy9TbkNCeXNVTE50ZFgvSTkzelgiLCJtYWMiOiIzMGU2ZmNlYWJmM2RjMzUzNGVhOWIwOTc9NGIwNmY0YWQ0MzdjY2RjYTE5ZTg0ZDg4ODI9NDI5NDAzZDZkZWNkNTlmIiwidGFnIjoiIn0%3D; dlpanda_session=eyJpIjoicUZtV0RJangwQXo2ZFZwZndxd1ZZck85OFMwWE9Edzg0ZnFUZXBGRzNVczNHeVpXbjFKdWhZQUFOZTBTZWRMUUN4Um1COVNDY3JRN1ZkWm5DUklseUlWTUNMc0huNkR1TjlZY2dpZUlPNExOcy9TbkNCeXNVTE50ZFgvSTkzelgiLCJtYWMiOiIzMGU2ZmNlYWJmM2DlgdMqMrdURupgpTcwPvOW6MWVaAvUnv4k_qtF_WI4XeKUFghBnCPT6-2I61p-IkBle-3xIg0ao-Fuz921rFwdOHdWKxAgnwgVewYjN-BPpJynw%3D%3D; FCNEC=%5B%5B%22AKsRol_1IXoIpvbEdbM5KJpi4sTFJvXiQ9eigpWLQvrmWuR0tVHN2aAiv7R-tN3T6POOnqE6glMWVaAvUnv4k_qtF_WI4XeKUFghBnCPT6-2I61p-IkBle-3xIg0ao-Fuz921rFwdOHdWKxAgnwgVewYjN-BPpJynw%3D%3D%22%5D%2Cnull%2C%5B%5D%5D',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-User': '?1'
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);

        let imgSrc = [];

        $('div.col-md-12 > img').each((index, element) => {
            imgSrc.push($(element).attr('src'));
        });

        // If no images from main URL, try backup (if still valid)
        if (imgSrc.length === 0) {
            response = await axios.get(backupUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/117.0',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'id,en-US;q=0.7,en;q=0.3',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Alt-Used': 'dlpanda.com',
                    'Connection': 'keep-alive',
                    // Again, be cautious with hardcoded cookies
                    'Cookie': 'cf_clearance=vdZS2yhltq5vorBBw7wPwGOxaRBiCANmFWRdAqKLlmI-1693612801-0-1-ab4b189c.e21c5b7c.f700a2ea-0.2.1693612801; _ga_DQ96ZJ6QXK=GS1.1.1693612800.2.1.1693612814.0.0.0; _ga=GA1.1.1626490340.1693347388; current_locale=id; __gads=ID=390b63a593862513-22debbc32ce300d7:T=1693347389:RT=1693612802:S=ALNI_Mbez6jYLnaF45LqwcUZR564jwrLgw; __gpi=UID=00000c3691b8b508:T=1693347389:RT=1693612802:S=ALNI_Ma03oA0UzqNgAsE2_fXRpT1NKg_Kw; fpestid=2g_N1gPYC68duNfJozpD093K-4zaMANBzHKNlh7x3Hg3XsGiN8TdNDAu6-MclRzqfUtePw; XSRF-TOKEN=eyJpIjoicUZtV0RJangwQXo2ZFZwZndxd1ZZck85OFMwWE9Edzg0ZnFUZXBGRzNVczNHeVpXbjFKdWhZQUFOZTBTZWRMUUN4Um1COVNDY3JRN1ZkWm5DUklseUlWTUNMc0huNkR1TjlZY2dpZUlPNExOcy9TbkNCeXNVTE50ZFgvSTkzelgiLCJpdiI6Ikd0ekE2VEdETkowRTh4OVYyU2ljeGc9PSIsInZhbHVlIjoicUZtV0RJangwQXo2ZFZwZndxd1ZZck85OFMwWE9Edzg0ZnFUZXBGRzNVczNHeVpXbjFKdWhZQUFOZTBTZWRMUUN4Um1COVNDY3JRN1ZkWm5DUklseUlWTUNMc0huNkR1TjlZY2dpZUlPNExOcy9TbkNCeXNVTE50ZFgvSTkzelgiLCJtYWMiOiIzMGU2ZmNlYWJmM2RjMzUzNGVhOWIwOTc9NGIwNmY0YWQ0MzdjY2RjYTE5ZTg0ZDg4ODI9NDI5NDAzZDZkZWNkNTlmIiwidGFnIjoiIn0%3D; dlpanda_session=eyJpIjoicUZtV0RJangwQXo2ZFZwZndxd1ZZck85OFMwWE9Edzg0ZnFUZXBGRzNVczNHeVpXbjFKdWhZQUFOZTBTZWRMUUN4Um1COVNDY3JRN1ZkWm5DUklseUlWTUNMc0huNkR1TjlZY2dpZUlPNExOcy9TbkNCeXNVTE50ZFgvSTkzelgiLCJtYWMiOiIzMGU2ZmNlYWJmM2DlgdMqMrdURupgpTcwPvOW6MWVaAvUnv4k_qtF_WI4XeKUFghBnCPT6-2I61p-IkBle-3xIg0ao-Fuz921rFwdOHdWKxAgnwgVewYjN-BPpJynw%3D%3D; FCNEC=%5B%5B%22AKsRol_1IXoIpvbEdbM5KJpi4sTFJvXiQ9eigpWLQvrmWuR0tVHN2aAiv7R-tN3T6POOnqE6glMWVaAvUnv4k_qtF_WI4XeKUFghBnCPT6-2I61p-IkBle-3xIg0ao-Fuz921rFwdOHdWKxAgnwgVewYjN-BPpJynw%3D%3D%22%5D%2Cnull%2C%5B%5D%5D',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'same-origin',
                    'Sec-Fetch-User': '?1'
                }
            });

            const html2 = response.data;
            const $2 = cheerio.load(html2);
            $2('div.col-md-12 > img').each((index, element) => {
                imgSrc.push($2(element).attr('src'));
            });
        }

        if (imgSrc.length === 0) {
            await m.react('❌'); // Error reaction
            throw `❌ *Carga visual fallida, Proxy ${name}.*\nNo se encontraron imágenes en el enlace proporcionado.`;
        }

        // Send all found images
        for (let i = 0; i < imgSrc.length; i++) {
            const imageUrl = imgSrc[i];
            const caption = `
╭━━━━[ 𝚃𝚒𝚔𝚃𝚘𝚔 𝙸𝚖𝚊𝚐𝚎 𝙳𝚎𝚌𝚘𝚍𝚎𝚍: 𝙿𝚊𝚛𝚝𝚎 ${i + 1}/${imgSrc.length} ]━━━━⬣
🖼️ *Contenido Visual:* Imágen de TikTok
🔗 *Enlace de Origen:* ${text}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`;

            try {
                // Using sendFile for images
                await conn.sendFile(m.chat, imageUrl, `tiktok_img_${i + 1}.jpg`, caption, m, null, { contextInfo, quoted: m });
                // No need for a separate react for each image, one at the end is fine,
                // or after each sendFile if you want real-time feedback for each.
            } catch (e) {
                console.error(`Error al enviar imagen ${i + 1}:`, e);
                // Can send a reply about a specific image failing
                m.replyExternal(`⚠️ *Error al enviar imagen ${i + 1}, Proxy ${name}.*\nDetalles: ${e.message}`, { contextInfo });
            }
        }
        await m.react('✅'); // Success reaction for the whole operation

    } catch (error) {
        console.error("Error al procesar TikTok Image:", error);
        await m.react('❌'); // Error reaction
        m.replyExternal(`⚠️ *Anomalía crítica en la operación de TikTok Image, Proxy ${name}.*\nNo pude completar la extracción. Verifica el enlace o informa del error.\nDetalles: ${error.message}`, { contextInfo });
    }
}

handler.help = ['tiktokimg <url>'];
handler.tags = ['descargas'];
handler.command = ['tiktokimg', 'ttimg'];
handler.group = true;
handler.register = true;
handler.coin = 2;

export default handler;
