import fetch from 'node-fetch';
import pkg from '@whiskeysockets/baileys';
const { generateWAMessageContent, proto } = pkg;

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

const imagenesEllen = [
    "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/086ec8e8-c373-45b6-ad51-3cdaef9cd3e6.jpg",
    "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/c99835de-0c28-4e27-93a0-422df6cca849.jpg",
    "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/6eee1198-1b0f-4cfe-b6c0-2fb82dc0bdc5.jpg",
    "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/18b2ad5d-a091-4267-8903-bb895dbefe6c.jpg",
    "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/23912e87-2b42-468c-bfd4-a4df62951c10.jpg",
    "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/7d874ab7-8a4c-4d76-b7dc-dfbcb589bd9b.jpg",
    "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/42f1cc96-bcd5-4c43-ac58-96883dba3047.jpg",
    "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/407e16b8-89d4-4d09-bd2f-a606ccc0e53c.jpg"
];

const handler = async (type, conn, m, comando) => {
    const imgUrl = imagenesEllen[Math.floor(Math.random() * imagenesEllen.length)];

    try {
        const { data: thumb } = await conn.getFile(imgUrl);

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

        const msgText = frasesEllen[type] || `『🦈』Lo siento, no tienes permiso para ejecutar *${comando}*.`;

        // Generamos el mensaje de imagen pero solo para extraer sus metadatos de subida
        const messageContent = await generateWAMessageContent(
            { image: { url: imgUrl } },
            { upload: conn.waUploadToServer }
        );

        const imageMsg = messageContent.imageMessage;

        const content = {
            extendedTextMessage: {
                text: `${msgText}\n\ncanal:\nhttps://whatsapp.com/channel/0029VbAuMiNCBtxOKcBfw71x`,
                matchedText: "https://whatsapp.com/channel/0029VbAuMiNCBtxOKcBfw71x",
                description: "Victoria Housekeeping Service - ZZZ",
                title: "𝐄llen 𝐉ᴏ𝐄's 𝐒ervice 🦈",
                previewType: 0,
                jpegThumbnail: thumb,
                // Extraemos los datos del mensaje de imagen generado y subido correctamente
                thumbnailDirectPath: imageMsg.directPath,
                thumbnailSha256: imageMsg.fileSha256,
                thumbnailEncSha256: imageMsg.fileEncSha256,
                mediaKey: imageMsg.mediaKey,
                mediaKeyTimestamp: imageMsg.mediaKeyTimestamp,
                thumbnailHeight: 720,
                thumbnailWidth: 1280,
                contextInfo: {
                    mentionedJid: [m.sender],
                    isForwarded: true,
                    forwardingScore: 1,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid,
                        newsletterName,
                        serverMessageId: -1
                    }
                }
            }
        };

        await conn.relayMessage(m.chat, content, { quoted: m });
        await m.react('✖️');

    } catch (e) {
        console.error('Error en Ellen Full Bypass:', e);
    }
};

export default handler;