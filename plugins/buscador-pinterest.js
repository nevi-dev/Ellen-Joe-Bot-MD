import axios from 'axios';
import * as cheerio from 'cheerio';
// Destructuring generateWAMessageContent, generateWAMessageFromContent, proto directly from baileys
const { generateWAMessageContent, generateWAMessageFromContent, proto } = (await import("@whiskeysockets/baileys"))["default"];

// --- CONSTANTES DE CONFIGURACIÓN DE TU BOT ---
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

// --- COOKIE DE SESIÓN (Debe estar actualizada) ---
const PINTEREST_SESSION_COOKIE = '_auth=0; _pinterest_sess=TWc9PSZtTkY0MDA3S21zdFJKNTVjOHl1aGU3NFhMeUFtbkVQODFzN1A3T3F1R2FoY1dLUGJTY0RlRVByTWlXVncyeTZnY0FPaXFFeDc3OXhJYll1M01oNVNZMDcwaFRGWXUrcVozRlhXYjV6azY5QT0maGRKanRxb1ZHMVZKV1Erc0htbU55YWNnVmxRPQ==; _routing_id="e1f58f6a-8596-4102-97a2-2b5f5ef5e2e7"; csrftoken=4cf353aa31282b83edf202ec4f62fdfc';

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
    'cookie': PINTEREST_SESSION_COOKIE 
};

/**
 * Función para extraer URLs de imagen de la búsqueda de Pinterest mediante Scrapeo HTML y JSON.
 * Se ha cambiado el dominio a 'es.pinterest.com'.
 * @param {string} query - Término de búsqueda.
 * @returns {Promise<string[]>} - Array de URLs de imágenes encontradas.
 */
async function scrapePinterest(query) {
    // URL MODIFICADA: Usando el dominio 'es.pinterest.com'
    const searchUrl = `https://es.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;

    const response = await axios.get(searchUrl, { headers: PINTEREST_HEADERS });
    const html = response.data;
    const $ = cheerio.load(html);
    
    const results = [];
    
    // 1. Búsqueda de URLs en el HTML (img tags)
    $('img').each((i, element) => {
        const src = $(element).attr('src') || $(element).attr('data-src');
        if (src && src.startsWith('https://i.pinimg.com/')) {
            results.push(src);
        }
    });
    
    // 2. Búsqueda de URLs en el JSON de estado (más fiable para grandes resultados)
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
// Estas funciones DEBEN existir y ser accesibles en tu bot.
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
  conn.reply(m.chat, `🔄 *Iniciando protocolo de barrido en Pinterest (Dominio ES), Proxy ${name}.* Aguarda, la carga visual está siendo procesada.`, m, { contextInfo, quoted: m });

  try {
    // 1. USAR LA FUNCIÓN DE SCRAPEO HTML CON COOKIE Y DOMINIO ES
    let imageUrls = await scrapePinterest(text);

    shuffleArray(imageUrls);
    let selectedImages = imageUrls.splice(0, 5);

    if (selectedImages.length === 0) {
      await m.react('❌');
      return conn.reply(m.chat, `❌ *Carga visual fallida, Proxy ${name}.*\nNo se encontraron imágenes en Pinterest. **La cookie de sesión podría haber caducado.**`, m, { contextInfo, quoted: m });
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
