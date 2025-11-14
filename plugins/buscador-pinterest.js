import axios from 'axios';
import * as cheerio from 'cheerio';
// Destructuring generateWAMessageContent, generateWAMessageFromContent, proto directly from baileys
const { generateWAMessageContent, generateWAMessageFromContent, proto } = (await import("@whiskeysockets/baileys"))["default"];

// --- Constantes y Configuración de Transmisión (Estilo Ellen Joe) ---
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

// --- COOKIE PROPORCIONADA (¡DEBE MANTENERSE ACTUALIZADA!) ---
const PINTEREST_SESSION_COOKIE =
    '_auth=1; _b="AVna7S1p7l1C5I9u0+nR3YzijpvXOPc6d09SyCzO+DcwpersQH36SmGiYfymBKhZcGg="; _pinterest_sess=TWc9PSZHamJOZ0JobUFiSEpSN3Z4a2NsMk9wZ3gxL1NSc2k2NkFLaUw5bVY5cXR5alZHR0gxY2h2MVZDZlNQalNpUUJFRVR5L3NlYy9JZkthekp3bHo5bXFuaFZzVHJFMnkrR3lTbm56U3YvQXBBTW96VUgzVUhuK1Z4VURGKzczUi9hNHdDeTJ5Y2pBTmxhc2owZ2hkSGlDemtUSnYvVXh5dDNkaDN3TjZCTk8ycTdHRHVsOFg2b2NQWCtpOWxqeDNjNkk3cS85MkhhSklSb0hwTnZvZVFyZmJEUllwbG9UVnpCYVNTRzZxOXNJcmduOVc4aURtM3NtRFo3STlmWjJvSjlWTU5ITzg0VUg1NGhOTEZzME9SNFNhVWJRWjRJK3pGMFA4Q3UvcHBnWHdaYXZpa2FUNkx6Z3RNQjEzTFJEOHZoaHRvazc1c1UrYlRuUmdKcDg3ZEY4cjNtZlBLRTRBZjNYK0lPTXZJTzQ5dU8ybDdVS015bWJKT0tjTWYyRlBzclpiamdsNmtpeUZnRjlwVGJXUmdOMXdTUkFHRWloVjBMR0JlTE5YcmhxVHdoNzFHbDZ0YmFHZ1VLQXU1QnpkM1FqUTNMTnhYb3VKeDVGbnhNSkdkNXFSMXQybjRGL3pyZXRLR0ZTc0xHZ0JvbTJCNnAzQzE0cW1WTndIK0trY05HV1gxS09NRktadnFCSDR2YzBoWmRiUGZiWXFQNjcwWmZhaDZQRm1UbzNxc21pV1p5WDlabm1UWGQzanc1SGlrZXB1bDVDWXQvUis3elN2SVFDbm1DSVE5Z0d4YW1sa2hsSkZJb1h0MTFpck5BdDR0d0lZOW1Pa2RDVzNySWpXWmUwOUFhQmFSVUpaOFQ3WlhOQldNMkExeDIvMjZHeXdnNjdMYWdiQUhUSEFBUlhUVTdBMThRRmh1ekJMYWZ2YTJkNlg0cmFCdnU2WEpwcXlPOVZYcGNhNkZDd051S3lGZmo0eHV0ZE42NW8xRm5aRWpoQnNKNnNlSGFad1MzOHNkdWtER0xQTFN5Z3lmRERsZnZWWE5CZEJneVRlMDd2VmNPMjloK0g5eCswZUVJTS9CRkFweHc5RUh6K1JocGN6clc1JmZtL3JhRE1sc0NMTFlpMVErRGtPcllvTGdldz0=; _ir=0';

// --- HEADERS OPTIMIZADOS (Incluyendo la cookie) ---
const PINTEREST_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'es-ES,es;q=0.9,en;q=0.8',
    'sec-ch-ua': '"Google Chrome";v="117", "Not;A=Brand";v="8", "Chromium";v="117"',
    'sec-ch-ua-mobile': '?0',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'cookie': PINTEREST_SESSION_COOKIE // <<<<< AÑADIMOS LA COOKIE AQUÍ
};

/**
 * Función para extraer URLs de imagen de la búsqueda de Pinterest mediante Scrapeo HTML.
 * @param {string} query - Término de búsqueda.
 * @returns {Promise<string[]>} - Array de URLs de imágenes encontradas.
 */
async function scrapePinterest(query) {
    // Usamos el dominio id.pinterest.com para la búsqueda
    const searchUrl = `https://id.pinterest.com/search/pins/?autologin=true&q=${encodeURIComponent(query)}`;

    // axios requiere la configuración de headers
    const response = await axios.get(searchUrl, { headers: PINTEREST_HEADERS });
    const html = response.data;
    const $ = cheerio.load(html);
    
    const results = [];
    
    // 1. Búsqueda de URLs directas en el HTML
    $('img').each((i, element) => {
        const src = $(element).attr('src') || $(element).attr('data-src');
        
        // Filtramos por el dominio de las imágenes de Pinterest
        if (src && src.startsWith('https://i.pinimg.com/')) {
            results.push(src);
        }
    });
    
    // 2. Búsqueda de URLs en el JSON de estado (más fiable para grandes resultados)
    const stateJson = $('script[data-js-app-state]').html();
    
    if (stateJson) {
        try {
            // El JSON de Pinterest es a menudo grande y difícil de parsear,
            // pero esta es una ruta conocida para los resultados de búsqueda:
            const data = JSON.parse(stateJson);
            const resources = data.resourceResponses.find(r => r.resource === 'BaseSearchResource');
            
            if (resources && resources.response?.data?.results) {
                const jsonUrls = resources.response.data.results
                    .map(item => item.images?.orig?.url) // Ruta común para la URL original
                    .filter(url => url && url.startsWith('https://i.pinimg.com/'));
                
                // Añadir resultados del JSON sin duplicar
                jsonUrls.forEach(url => {
                    if (!results.includes(url)) {
                        results.push(url);
                    }
                });
            }
        } catch (e) {
            console.error("Error parsing Pinterest state JSON (es común si la cookie falla):", e);
        }
    }
    
    // Devolvemos el array de URLs (que pueden ser vacías si la cookie falló)
    return results;
}


let handler = async (m, { conn, text, usedPrefix, command }) => {
    // ... (El resto del handler, incluyendo contextInfo, validación de texto, y funciones auxiliares, permanece igual) ...
    const name = conn.getName(m.sender);

    const contextInfo = {
        mentionedJid: [m.sender],
        isForwarded: true,
        forwardingScore: 999,
        forwardedNewsletterMessageInfo: {
            newsletterJid,
            newsletterName,
            serverMessageId: -1
        },
        externalAdReply: {
            title: 'Ellen Joe: Pista localizada. 🦈',
            body: `Procesando solicitud para el/la Proxy ${name}...`,
            thumbnail: icons,
            sourceUrl: redes,
            mediaType: 1,
            renderLargerThumbnail: false
        }
    };

    if (!text) {
        return conn.reply(m.chat, `🦈 *Rastro frío, Proxy ${name}.* Necesito un término de búsqueda para localizar imágenes en Pinterest.`, m, { contextInfo, quoted: m });
    }

    await m.react('🔄');
    conn.reply(m.chat, `🔄 *Iniciando protocolo de barrido en Pinterest (Con Cookie), Proxy ${name}.* Aguarda, la carga visual está siendo procesada.`, m, { contextInfo, quoted: m });

    // Funciones auxiliares (asumo que están definidas en tu entorno)
    async function getImageMessage(imageUrl) { /* ... */ }
    function shuffleArray(array) { /* ... */ }
    
    try {
        // 1. USAR LA FUNCIÓN DE SCRAPEO HTML CON COOKIE
        let imageUrls = await scrapePinterest(text);

        shuffleArray(imageUrls); // Shuffle the results
        let selectedImages = imageUrls.splice(0, 5); // Take up to 5 images

        if (selectedImages.length === 0) {
            await m.react('❌'); // Error reaction
            return conn.reply(m.chat, `❌ *Carga visual fallida, Proxy ${name}.*\nNo se encontraron imágenes en Pinterest. **Verifica si la cookie de sesión sigue siendo válida.**`, m, { contextInfo, quoted: m });
        }

        // 2. Lógica de Carousel (permanece igual)
        let carouselCards = [];
        let imageCounter = 1;

        for (let imageUrl of selectedImages) {
            carouselCards.push({
                'body': proto.Message.InteractiveMessage.Body.fromObject({
                    'text': `Imagen de ${text} - ${imageCounter++}`
                }),
                'footer': proto.Message.InteractiveMessage.Footer.fromObject({
                    'text': `Procesado por Ellen Joe's Service` // Custom footer
                }),
                'header': proto.Message.InteractiveMessage.Header.fromObject({
                    'title': '',
                    'hasMediaAttachment': true,
                    'imageMessage': await getImageMessage(imageUrl)
                }),
                'nativeFlowMessage': proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                    'buttons': [{
                        'name': "cta_url",
                        'buttonParamsJson': JSON.stringify({
                            "display_text": "Ver en Pinterest 🔗",
                            "url": `https://www.pinterest.com/search/pins/?rs=typed&q=${encodeURIComponent(text)}`,
                            "merchant_url": `https://www.pinterest.com/search/pins/?rs=typed&q=${encodeURIComponent(text)}`
                        })
                    }]
                })
            });
        }

        const carouselMessage = generateWAMessageFromContent(m.chat, {
            'viewOnceMessage': {
                'message': {
                    'messageContextInfo': {
                        'deviceListMetadata': {},
                        'deviceListMetadataVersion': 2
                    },
                    'interactiveMessage': proto.Message.InteractiveMessage.fromObject({
                        'body': proto.Message.InteractiveMessage.Body.create({
                            'text': `╭━━━━[ 𝙿𝚒𝚗𝚝𝚎𝚛𝚎𝚜𝚝 𝙳𝚎𝚌𝚘𝚍𝚎𝚍: 𝚁𝚎𝚜𝚞𝚕𝚝𝚊𝚍𝚘𝚜 𝚅𝚒𝚜𝚞𝚊𝚕𝚎𝚜 ]━━━━⬣\n🖼️ *Término de Búsqueda:* ${text}\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`
                        }),
                        'footer': proto.Message.InteractiveMessage.Footer.create({
                            'text': "⪛✰ Barrido de Pinterest - Ellen Joe's Service ✰⪜"
                        }),
                        'header': proto.Message.InteractiveMessage.Header.create({
                            'hasMediaAttachment': false
                        }),
                        'carouselMessage': proto.Message.InteractiveMessage.CarouselMessage.fromObject({
                            'cards': carouselCards
                        })
                    })
                }
            }
        }, { 'quoted': m });

        await m.react('✅'); // Success reaction
        await conn.relayMessage(m.chat, carouselMessage.message, { 'messageId': carouselMessage.key.id });

    } catch (error) {
        console.error("Error al procesar Pinterest search:", error);
        await m.react('❌'); // Error reaction
        // Si el error es 403, damos un mensaje específico sobre la cookie.
        const errorMessage = error.response?.status === 403 
                             ? `¡Bloqueo 403! La cookie de sesión ha caducado. Necesitas actualizar la constante PINTEREST_SESSION_COOKIE.`
                             : `No pude completar la búsqueda. Detalles: ${error.message}`;

        conn.reply(m.chat, `⚠️ *Anomalía crítica en la operación de Pinterest, Proxy ${name}.*\n${errorMessage}`, m, { contextInfo, quoted: m });
    }
};

handler.help = ["pinterest <término>"];
handler.tags = ["descargas"];
handler.coin = 1;
handler.group = true;
handler.register = true;
handler.command = ['pinterest', 'pin'];

export default handler;
