import crypto from 'crypto';

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';
const packname = '˚🄴🄻🄼🄴🄽-🄹🄾🄴-🄱🄾🅃';
const redes = 'https://github.com/nevi-dev';

const handler = async (type, conn, m, comando) => {
    // 1. Verificación de seguridad para el buffer
    const thumbnail = global.icons; 
    if (!thumbnail) return console.log('Error: global.icons no está definido o está vacío.');

    try {
        // 2. Subida corregida con el tipo de media 'thumbnail-link'
        // Esto soluciona el TypeError: Cannot read properties of undefined (reading 'replace')
        const upload = await conn.waUploadToServer(thumbnail, { 
            mediaType: 'thumbnail-link' 
        });

        const thumbnailDirectPath = upload.directPath;
        const mediaKey = upload.mediaKey.toString('base64');
        const thumbnailSha256 = crypto.createHash('sha256').update(thumbnail).digest('base64');
        const timestamp = Math.floor(Date.now() / 1000);

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
                    description: "🦈 Ellen JoE - Service Status: Denied",
                    title: packname,
                    previewType: 0,
                    jpegThumbnail: thumbnail,
                    contextInfo: {
                        mentionedJid: [m.sender],
                        isForwarded: true,
                        forwardingScore: 999,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid,
                            newsletterName,
                            serverMessageId: -1
                        },
                        expiration: 604800
                    },
                    thumbnailDirectPath: thumbnailDirectPath,
                    thumbnailSha256: thumbnailSha256,
                    mediaKey: mediaKey,
                    mediaKeyTimestamp: timestamp,
                    thumbnailHeight: 400,
                    thumbnailWidth: 400
                }
            };

            await conn.relayMessage(m.chat, content, { quoted: m });
            return m.react('✖️');
        }
    } catch (error) {
        console.error('Error en la subida de Ellen Joe:', error);
    }
};

export default handler;
