import axios from 'axios';
import * as cheerio from 'cheerio';
// Importamos JSDOM para ejecutar JavaScript en Node.js
import { JSDOM } from 'jsdom'; 
// Destructuring generateWAMessageContent, generateWAMessageFromContent, proto directly from baileys
const { generateWAMessageContent, generateWAMessageFromContent, proto } = (await import("@whiskeysockets/baileys"))["default"];

// --- CONSTANTES DE CONFIGURACIÓN DE TU BOT ---
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

// --- ALMACENAMIENTO DE LA COOKIE (¡ESTO ES NUEVO!) ---
// Almacenamos la cookie de forma global para reusarla en peticiones rápidas.
// Inicialmente usamos la última cookie de sesión, o la dejamos vacía para que se autogenere.
let CURRENT_PINTEREST_COOKIE = '_auth=0; _pinterest_sess=TWc9PSZtTkY0MDA3S21zdFJKNTVjOHl1aGU3NFhMeUFtbkVQODFzN1A3T3F1R2FoY1dLUGJTY0RlRVByTWlXVncyeTZnY0FPaXFFeDc3OXhJYll1M01oNVNZMDcwaFRGWXUrcVozRlhXYjV6azY5QT0maGRKanRxb1ZHMVZKV1Erc0htbU55YWNnVmxRPQ==; _routing_id="e1f58f6a-8596-4102-97a2-2b5f5ef5e2e7"; csrftoken=4cf353aa31282b83edf202ec4f62fdfc';


// --- HEADERS BASE ---
const BASE_HEADERS = {
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
    'upgrade-insecure-requests': '1'
};

/**
 * [EXPERIMENTAL] Intenta obtener la cookie de visitante (_b) ejecutando el JS de Pinterest con jsdom.
 * Esto es un intento de "negociación" de la cookie sin usar un navegador completo.
 */
async function getVisitorCookie() {
    console.log("Intentando autogenerar cookie de visitante con JSDOM...");
    
    // Hacemos una petición sin ninguna cookie para forzar a Pinterest a enviarnos el JS de generación.
    const url = 'https://es.pinterest.com/';
    const response = await axios.get(url, { headers: BASE_HEADERS });
    const html = response.data;

    try {
        // Inicializamos JSDOM para simular el entorno del navegador
        const dom = new JSDOM(html, {
            url: url,
            referrer: 'https://www.google.com/',
            runScripts: 'dangerously', // Ejecutamos el JavaScript
            resources: 'usable',
            pretendToBeVisual: true 
        });

        // Damos tiempo al JavaScript de Pinterest para que se ejecute y cree la cookie
        await new Promise(resolve => setTimeout(resolve, 5000)); // Espera de 5 segundos
        
        // Extraemos todas las cookies que el JS de Pinterest generó
        const cookies = dom.window.document.cookie;
        
        if (cookies) {
            console.log(`Cookie generada por JSDOM: ${cookies}`);
            // Devolvemos la cadena completa de cookies generadas
            return cookies; 
        }

    } catch (e) {
        console.error("JSDOM falló al generar la cookie.", e);
    }
    return null;
}


/**
 * Función principal para extraer URLs de imagen de la búsqueda de Pinterest.
 * Utiliza la cookie almacenada globalmente.
 */
async function scrapePinterest(query) {
    // Si la cookie está vacía o es obsoleta, intentamos autogenerarla.
    if (!CURRENT_PINTEREST_COOKIE || CURRENT_PINTEREST_COOKIE.includes('_pinterest_sess=') && CURRENT_PINTEREST_COOKIE.includes('TWc9PSZtTkY0MDA3S21zdFJKNTVjOHl1aGU3NFhMeUFtbkVQODFzN1A3T3F1R2FoY1dLUGJTY0RlRVByTWlXVncyeTZnY0FPaXFFeDc3OXhJYll1M01oNVNZMDcwaFRGWXUrcVozRlhXYjV6azY5QT0maGRKanRxb1ZHMVZKV1Erc0htbU55YWNnVmxRPQ==')) {
        const newCookie = await getVisitorCookie();
        if (newCookie) {
            CURRENT_PINTEREST_COOKIE = newCookie;
        } else {
            console.warn("No se pudo autogenerar la cookie. El scrapeo probablemente fallará.");
        }
    }
    
    const searchUrl = `https://es.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;

    // HEADERS con la cookie actual (sea la original o la generada por JSDOM)
    const PINTEREST_HEADERS = { ...BASE_HEADERS, 'cookie': CURRENT_PINTEREST_COOKIE };

    const response = await axios.get(searchUrl, { headers: PINTEREST_HEADERS });
    const html = response.data;
    const $ = cheerio.load(html);
    
    const results = [];
    
    // ... (Lógica de scraping de HTML y JSON data-js-app-state permanece igual) ...
    $('img').each((i, element) => {
        const src = $(element).attr('src') || $(element).attr('data-src');
        if (src && src.startsWith('https://i.pinimg.com/')) {
            results.push(src);
        }
    });
    
    const stateJson = $('script[data-js-app-state]').html();
    
    if (stateJson) {
        try {
            const data = JSON.parse(stateJson);
            const resources = data.resourceResponses.find(r => r.resource === 'BaseSearchResource');
            
            if (resources && resources.response?.data?.results) {
                const jsonUrls = resources.response.data.results
                    .map(item => item.images?.orig?.url)
                    .filter(url => url && url.startsWith('https://i.pinimg.com/'));
                
                jsonUrls.forEach(url => {
                    if (!results.includes(url)) {
                        results.push(url);
                    }
                });
            }
        } catch (e) {
            console.error("Error parsing Pinterest state JSON:", e);
        }
    }
    
    return results;
}


// --- FUNCIONES AUXILIARES (Asumo que ya están definidas en tu entorno) ---
async function getImageMessage(imageUrl) { 
    const { imageMessage } = await generateWAMessageContent({
        'image': { 'url': imageUrl }
    }, { 'upload': conn.waUploadToServer });
    return imageMessage;
}
function shuffleArray(array) { 
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
// --------------------------------------------------------------------------


let handler = async (m, { conn, text, usedPrefix, command }) => {
    // ... (El resto del handler de mensajes permanece igual, solo llama a la función scrapePinterest) ...
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
            thumbnail: icons, // Asume que 'icons' y 'redes' existen
            sourceUrl: redes,
            mediaType: 1,
            renderLargerThumbnail: false
        }
    };

    if (!text) {
        return conn.reply(m.chat, `🦈 *Rastro frío, Proxy ${name}.* Necesito un término de búsqueda para localizar imágenes en Pinterest.`, m, { contextInfo, quoted: m });
    }

    await m.react('🔄');
    conn.reply(m.chat, `🔄 *Iniciando protocolo de barrido en Pinterest (Intentando autogenerar cookie con JSDOM), Proxy ${name}.* Aguarda, la carga visual está siendo procesada.`, m, { contextInfo, quoted: m });

    try {
        let imageUrls = await scrapePinterest(text);

        shuffleArray(imageUrls);
        let selectedImages = imageUrls.splice(0, 5);

        if (selectedImages.length === 0) {
            await m.react('❌');
            return conn.reply(m.chat, `❌ *Carga visual fallida, Proxy ${name}.*\nNo se encontraron imágenes en Pinterest. **La generación automática de la cookie falló.**`, m, { contextInfo, quoted: m });
        }

        // 2. Lógica de Carousel (Envío de Mensajes)
        let carouselCards = [];
        let imageCounter = 1;

        for (let imageUrl of selectedImages) {
            carouselCards.push({
                'body': proto.Message.InteractiveMessage.Body.fromObject({
                    'text': `Imagen de ${text} - ${imageCounter++}`
                }),
                'footer': proto.Message.InteractiveMessage.Footer.fromObject({
                    'text': `Procesado por Ellen Joe's Service`
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

        await m.react('✅');
        await conn.relayMessage(m.chat, carouselMessage.message, { 'messageId': carouselMessage.key.id });

    } catch (error) {
        console.error("Error al procesar Pinterest search:", error);
        await m.react('❌');

        // Si falla la petición de búsqueda (y no se pudo generar la cookie), es un error de red o 403.
        conn.reply(m.chat, `⚠️ *Anomalía crítica en la operación de Pinterest, Proxy ${name}.*\nFallo en la conexión o la generación de la cookie.\nDetalles: ${error.message}`, m, { contextInfo, quoted: m });
    }
};

handler.help = ["pinterest <término>"];
handler.tags = ["descargas"];
handler.coin = 1;
handler.group = true;
handler.register = true;
handler.command = ['pinterest', 'pin'];

export default handler;
