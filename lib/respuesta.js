import crypto from 'crypto';
import fetch from 'node-fetch';
import sharp from 'sharp'; 

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

const imagenesEllen = [
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/086ec8e8-c373-45b6-ad51-3cdaef9cd3e6.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/c99835de-0c28-4e27-93a0-422df6cca849.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/6eee1198-1b0f-4cfe-b6c0-2fb82dc0bdc5.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/18b2ad5d-a091-4267-8903-bb895dbefe6c.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/23912e87-2b42-468c-bfd4-a4df62951c10.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/7d874ab7-8a4c-4d76-b7dc-dfbcb589bd9b.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/42f1cc96-bcd5-4c43-ac58-96883dba3047.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/407e16b8-89d4-4d09-bd2f-a606ccc0e53c.jpg?raw=true"
];

const handler = async (type, conn, m, comando) => {
    const imgUrl = imagenesEllen[Math.floor(Math.random() * imagenesEllen.length)];

    try {
        const response = await fetch(imgUrl);
        const resBuffer = await response.buffer();

        // 1. PROCESAMIENTO PRO: Forzamos dimensiones 16:9 o las reales para evitar el recorte cuadrado
        const metadata = await sharp(resBuffer).metadata();
        const { width, height } = metadata;

        const frasesEllen = {
            rowner: `『🦈』¿Intentando usar *${comando}*? Solo mi Creador puede tocar mi cola de tiburón. Aléjate.`,
            owner: `『⚙️』Comando exclusivo para Owners. No insistas, tengo un batido que terminar. 🙄`,
            mods: `『🔌』¿Permisos para *${comando}*? Solo mis Moderadores. Tú no estás en la lista. 😏`,
            premium: `『🌟』¿Quieres atención especial? Paga el servicio Premium. No trabajo gratis. 💅`,
            group: `『🫂』Qué pesado... *${comando}* es solo para grupos. Baka~`,
            private: `『🏠』Este comando es para chats privados. No hagas ruido aquí. 😒`,
            admin: `『👑』Solo los Admins pueden usar *${comando}*. Tú eres un cliente más. 💁‍♀️`,
            botAdmin: `『🚫』¿Cómo lo ejecuto si no soy Admin? Dame los permisos. 🤨`,
            unreg: `『📝』Regístrate con: *#reg Nombre.Edad* antes de pedirme algo. 😈`,
            restrict: `『⛔』Función restringida. Ni con un aumento te dejaría usar *${comando}*.`
        };

        const msgText = frasesEllen[type];

        if (msgText) {
            // 2. INYECCIÓN TÉCNICA DE ALTA CREDIBILIDAD
            await conn.sendMessage(m.chat, {
                text: msgText,
                contextInfo: {
                    mentionedJid: [m.sender],
                    isForwarded: true,
                    forwardingScore: 1, // Score bajo para que parezca contenido "orgánico"
                    forwardedNewsletterMessageInfo: {
                        newsletterJid,
                        newsletterName,
                        serverMessageId: -1
                    },
                    externalAdReply: {
                        title: "𝐄llen 𝐉ᴏ𝐄's 𝐒ervice 🦈",
                        body: "˚🄴🄻🄼🄴🄽-🄹🄾🄴-🄱🄾🅃",
                        mediaType: 1, // MEDIA_TYPE_VIDEO: Engañamos para que use el renderizador de video (más grande)
                        thumbnail: resBuffer, 
                        renderLargerThumbnail: true,
                        // SIMULACIÓN DE YOUTUBE: Esto es lo que lo hace "creíble" para el servidor
                        mediaUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 
                        sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                        // Dimensiones reales inyectadas para evitar que el motor de WA recorte la imagen
                        thumbnailHeight: height,
                        thumbnailWidth: width,
                        containsAutoPlayingVideo: false
                    }
                }
            }, { quoted: m });

            return m.react('✖️');
        }
    } catch (e) {
        console.error('Error en bypass Pro:', e);
    }
};

export default handler;
