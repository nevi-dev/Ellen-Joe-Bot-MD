import fetch from 'node-fetch';
import pkg from '@whiskeysockets/baileys';
const { generateWAMessageContent, proto } = pkg;

// Configuración de Identidad y Canal
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

// Única fuente de imagen para el Bypass (Pinterest)
const pinEllen = "https://pin.it/5fKkmRTyS";

const handler = async (type, conn, m, comando) => {
    try {
        // 1. Reaccionamos para dar feedback de que estamos procesando
        await m.react('⏳');

        // 2. Obtenemos el buffer de la imagen del Pin para el jpegThumbnail (Vista previa rápida)
        const { data: thumbBuffer } = await conn.getFile(pinEllen);

        // 3. --- EL SECRETO DEL BYPASS ---
        // Subimos la imagen a los servidores de Meta en tiempo real.
        // Esto nos devuelve las llaves (DirectPath, SHAs, mediaKey) necesarias para que WA la renderice nítida y grande.
        const uploadContent = await generateWAMessageContent(
            { image: { url: pinEllen } },
            { upload: conn.waUploadToServer }
        );
        const imageMeta = uploadContent.imageMessage;

        // 4. Base de datos de frases decoradas
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

        const msgText = frasesEllen[type] || `『🦈』Acceso denegado para *${comando}*.`;

        // 5. Construcción del nodo extendedTextMessage con Full Bypass
        const content = {
            extendedTextMessage: {
                text: msgText, // Texto limpio y decorado
                matchedText: pinEllen, // Link de Pinterest para activar el renderizado grande
                description: "Victoria Housekeeping Service",
                title: "𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice 🦈",
                previewType: 0,
                jpegThumbnail: thumbBuffer, // Buffer de imagen rápida

                // --- INYECCIÓN DE METADATOS REALES ---
                thumbnailDirectPath: imageMeta.directPath,
                thumbnailSha256: imageMeta.fileSha256,
                thumbnailEncSha256: imageMeta.fileEncSha256,
                mediaKey: imageMeta.mediaKey,
                mediaKeyTimestamp: imageMeta.mediaKeyTimestamp,
                // Relación de aspecto vertical típica de Pinterest
                thumbnailHeight: 736, 
                thumbnailWidth: 414,
                // -------------------------------------

                inviteLinkGroupTypeV2: 0,
                contextInfo: {
                    mentionedJid: [m.sender],
                    isForwarded: true,
                    forwardingScore: 999, // Forza el modo "reenviado muchas veces" que a veces ayuda al render
                    forwardedNewsletterMessageInfo: {
                        newsletterJid,
                        newsletterName,
                        serverMessageId: -1
                    },
                    // Estructura de citado externo para que se vea elegante en la lista de chats
                    externalAdReply: {
                        title: "𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice 🦈",
                        body: "Victoria Housekeeping Service",
                        mediaType: 1,
                        previewType: 0,
                        thumbnail: thumbBuffer,
                        sourceUrl: pinEllen,
                        renderLargerThumbnail: true
                    }
                }
            }
        };

        // 6. Enviamos el mensaje crudo con relayMessage, citando siempre el mensaje del usuario (m)
        await conn.relayMessage(m.chat, content, { quoted: m });
        
        // 7. Reacción final de error (según tu diseño)
        await m.react('✖️');

    } catch (e) {
        console.error('Error Crítico en Ellen Full Bypass:', e);
        // Fallback simple si todo falla
        conn.reply(m.chat, `『🦈』Algo salió mal, pero no tienes permisos de todas formas.`, m);
    }
};

export default handler;
