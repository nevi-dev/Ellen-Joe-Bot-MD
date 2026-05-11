import crypto from 'crypto';
import fetch from 'node-fetch';
import sharp from 'sharp'; 

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';
const packname = '˚🄴🄻🄼🄴🄽-🄹🄾🄴-🄱🄾🅃';
const redes = 'https://github.com/nevi-dev';

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
        const buffer = await response.buffer();

        // ANALIZADOR DE DIMENSIONES (Sharp detecta el tamaño real para evitar cortes)
        const metadata = await sharp(buffer).metadata();
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
            const content = {
                extendedTextMessage: {
                    text: msgText,
                    matchedText: redes,
                    jpegThumbnail: buffer,
                    contextInfo: {
                        mentionedJid: [m.sender],
                        isForwarded: true,
                        forwardingScore: 999,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid,
                            newsletterName,
                            serverMessageId: -1
                        }
                    },
                    // INYECCIÓN DE METADATOS DE ALTA RESOLUCIÓN
                    // Esto engaña a WhatsApp para que use el buffer original sin comprimir
                    thumbnailDirectPath: `/v/t62.36144-24/e_${crypto.randomBytes(8).toString('hex')}.enc`,
                    thumbnailSha256: crypto.createHash('sha256').update(buffer).digest('base64'),
                    thumbnailEncSha256: crypto.createHash('sha256').update(buffer).digest('base64'),
                    mediaKey: crypto.randomBytes(32).toString('base64'),
                    mediaKeyTimestamp: Math.floor(Date.now() / 1000),
                    thumbnailHeight: height, // Altura real detectada
                    thumbnailWidth: width    // Ancho real detectado
                }
            };

            await conn.relayMessage(m.chat, content, { quoted: m });
            return m.react('✖️');
        }
    } catch (e) {
        console.error('Error en el renderizado inteligente:', e);
    }
};

export default handler;
