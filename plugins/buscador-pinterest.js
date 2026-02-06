import axios from 'axios';
const { generateWAMessageContent, generateWAMessageFromContent, proto } = (await import("@whiskeysockets/baileys"))["default"];

// --- CONFIGURACIÓN ---
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';
const CAUSA_API_KEY = 'causa-ee5ee31dcfc79da4'; 

// --- FUNCIONES AUXILIARES ---
async function getImageMessage(imageUrl, conn) { 
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

let handler = async (m, { conn, text, usedPrefix, command }) => {
    const name = conn.getName(m.sender);

    const contextInfo = {
        mentionedJid: [m.sender],
        isForwarded: true,
        forwardingScore: 999,
        forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 },
        externalAdReply: {
            title: 'Ellen Joe: Rastro Visual Detectado 🦈',
            body: `Extrayendo datos para Proxy ${name}...`,
            thumbnail: icons, // Asegúrate que 'icons' esté definido globalmente
            sourceUrl: redes, // Asegúrate que 'redes' esté definido globalmente
            mediaType: 1,
            renderLargerThumbnail: false
        }
    };

    if (!text) return conn.reply(m.chat, `🦈 *Rastro frío, Proxy ${name}.* Dime qué buscar en Pinterest.`, m, { contextInfo, quoted: m });

    await m.react('🔄');
    conn.reply(m.chat, `🔄 *Iniciando barrido de red (Causa API)...* Buscando: ${text}`, m, { contextInfo, quoted: m });

    try {
        // 1. LLAMADA A LA NUEVA API (GET)
        const response = await axios.get(`https://rest.apicausas.xyz/api/v1/buscadores/pinterest`, {
            params: {
                q: text,
                apikey: CAUSA_API_KEY
            }
        });

        const json = response.data;

        // 2. VALIDACIÓN DE DATOS
        if (json.status && json.data && json.data.length > 0) {
            let results = json.data;
            shuffleArray(results);
            let selected = results.slice(0, 5); // Tomamos 5 resultados

            // 3. CONSTRUCCIÓN DE TARJETAS PARA EL CARRUSEL
            let carouselCards = [];
            for (let item of selected) {
                carouselCards.push({
                    'body': proto.Message.InteractiveMessage.Body.fromObject({
                        'text': `📌 *Descripción:* ${item.title || 'Sin descripción'}`
                    }),
                    'footer': proto.Message.InteractiveMessage.Footer.fromObject({
                        'text': `Fuente: Pinterest`
                    }),
                    'header': proto.Message.InteractiveMessage.Header.fromObject({
                        'hasMediaAttachment': true,
                        'imageMessage': await getImageMessage(item.image, conn)
                    }),
                    'nativeFlowMessage': proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                        'buttons': [{
                            'name': "cta_url",
                            'buttonParamsJson': JSON.stringify({
                                "display_text": "Ver Original 🔗",
                                "url": item.link,
                                "merchant_url": item.link
                            })
                        }]
                    })
                });
            }

            const carouselMessage = generateWAMessageFromContent(m.chat, {
                'viewOnceMessage': {
                    'message': {
                        'interactiveMessage': proto.Message.InteractiveMessage.fromObject({
                            'body': proto.Message.InteractiveMessage.Body.create({
                                'text': `╭━━━━[ 𝙿𝚒𝚗𝚝𝚎𝚛𝚎𝚜𝚝 𝙳𝚎𝚌𝚘𝚍𝚎𝚍 ]━━━━⬣\n🖼️ *Proxy:* ${name}\n🔎 *Búsqueda:* ${text}\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`
                            }),
                            'footer': proto.Message.InteractiveMessage.Footer.create({
                                'text': "Ellen Joe's Service | Causa API"
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

        } else {
            throw new Error("No se encontraron resultados.");
        }

    } catch (error) {
        console.error(error);
        await m.react('❌');
        conn.reply(m.chat, `⚠️ *Anomalía, Proxy ${name}.*\nNo pude obtener las imágenes.\nMotivo: ${error.message}`, m, { contextInfo, quoted: m });
    }
};

handler.help = ["pinterest <término>"];
handler.tags = ["descargas"];
handler.command = ['pinterest', 'pin'];
handler.register = true;

export default handler;
