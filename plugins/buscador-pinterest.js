import axios from 'axios';
import * as cheerio from 'cheerio'; // Necesitamos cheerio para el scraping HTML
// Destructuring generateWAMessageContent, generateWAMessageFromContent, proto directly from baileys
const { generateWAMessageContent, generateWAMessageFromContent, proto } = (await import("@whiskeysockets/baileys"))["default"];

// --- Constantes y Configuración de Transmisión (Estilo Ellen Joe) ---
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

// --- HEADERS OPTIMIZADOS (Basados en el scraper exitoso de Google/Pinterest) ---
const PINTEREST_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'es-ES,es;q=0.9,en;q=0.8',
    'sec-ch-ua': '"Google Chrome";v="117", "Not;A=Brand";v="8", "Chromium";v="117"',
    'sec-ch-ua-mobile': '?0',
    'sec-fetch-dest': 'document', // Cambiado a document para HTML scraping
    'sec-fetch-mode': 'navigate', // Simula navegación
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1'
};

/**
 * Función para extraer URLs de imagen de la búsqueda de Pinterest mediante Scrapeo HTML.
 * @param {string} query - Término de búsqueda.
 * @returns {Promise<string[]>} - Array de URLs de imágenes encontradas.
 */
async function scrapePinterest(query) {
    // Usamos el dominio que usó el scraper, sin la cookie
    const searchUrl = `https://id.pinterest.com/search/pins/?autologin=true&q=${encodeURIComponent(query)}`;

    // axios requiere la configuración de headers
    const response = await axios.get(searchUrl, { headers: PINTEREST_HEADERS });
    const html = response.data;
    const $ = cheerio.load(html);
    
    const results = [];
    
    // Buscar todas las etiquetas img. Los pines suelen usar data-src o src directo.
    $('img').each((i, element) => {
        const src = $(element).attr('src') || $(element).attr('data-src');
        
        // Filtramos para asegurar que es una URL válida de Pinterest
        if (src && src.startsWith('https://i.pinimg.com/')) {
            results.push(src);
        }
    });
    
    // Adicionalmente, Pinterest a veces oculta las URLs en el JSON de estado (similar a Google)
    // Buscamos el JSON de estado en los scripts para una extracción más completa.
    const stateJson = $('script[data-js-app-state]').html();
    
    if (stateJson) {
        try {
            const data = JSON.parse(stateJson);
            // La ruta exacta al array de pines varía, pero a menudo está en la 'resource_response'
            const resources = data.resourceResponses.find(r => r.resource === 'BaseSearchResource');
            if (resources && resources.response.data.results) {
                const jsonUrls = resources.response.data.results
                    .map(item => item.images?.orig?.url)
                    .filter(url => url && url.startsWith('https://i.pinimg.com/'));
                
                // Añadir resultados del JSON sin duplicar
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


let handler = async (m, { conn, text, usedPrefix, command }) => {
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
    externalAdReply: {
      title: 'Ellen Joe: Pista localizada. 🦈',
      body: `Procesando solicitud para el/la Proxy ${name}...`,
      thumbnail: icons, // Ensure 'icons' and 'redes' are globally defined
      sourceUrl: redes,
      mediaType: 1,
      renderLargerThumbnail: false
    }
  };

  if (!text) {
    return conn.reply(m.chat, `🦈 *Rastro frío, Proxy ${name}.* Necesito un término de búsqueda para localizar imágenes en Pinterest.`, m, { contextInfo, quoted: m });
  }

  await m.react('🔄'); // Processing reaction
  conn.reply(m.chat, `🔄 *Iniciando protocolo de barrido en Pinterest (Scrape HTML), Proxy ${name}.* Aguarda, la carga visual está siendo procesada.`, m, { contextInfo, quoted: m });

  // --- Funciones auxiliares (mantienen su lugar) ---
  async function getImageMessage(imageUrl) { /* ... */ } // Mantén la implementación original
  function shuffleArray(array) { /* ... */ } // Mantén la implementación original

  try {
    // 1. USAR LA FUNCIÓN DE SCRAPEO HTML
    let imageUrls = await scrapePinterest(text);

    shuffleArray(imageUrls); // Shuffle the results
    let selectedImages = imageUrls.splice(0, 5); // Take up to 5 images

    if (selectedImages.length === 0) {
      await m.react('❌'); // Error reaction
      return conn.reply(m.chat, `❌ *Carga visual fallida, Proxy ${name}.*\nNo se encontraron imágenes en Pinterest para "${text}". (Puede requerir una cookie activa).`, m, { contextInfo, quoted: m });
    }

    // --- Lógica de Carousel (permanece igual) ---
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
    conn.reply(m.chat, `⚠️ *Anomalía crítica en la operación de Pinterest, Proxy ${name}.*\nNo pude completar la búsqueda.\nDetalles: ${error.message}`, m, { contextInfo, quoted: m });
  }
};

handler.help = ["pinterest <término>"];
handler.tags = ["descargas"];
handler.coin = 1;
handler.group = true;
handler.register = true;
handler.command = ['pinterest', 'pin'];

export default handler;
