import fetch from 'node-fetch';

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
        // 1. Obtener buffer y subir al servidor de WA para generar metadatos válidos
        const res = await fetch(imgUrl);
        const buffer = await res.buffer();
        const upload = await conn.waUploadToServer(buffer, { mimetype: 'image/jpeg' });
        const { data: thumb } = await conn.getFile(imgUrl);

        // 2. Diccionario completo de frases de Ellen
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

        // 3. Nodo de mensaje extendido (Simulando link nativo de GitHub)
        const content = {
            extendedTextMessage: {
                text: `${msgText}\n\nhttps://github.com/nevi-dev`,
                matchedText: "https://github.com/nevi-dev",
                description: "Victoria Housekeeping Service - ZZZ",
                title: "𝐄llen 𝐉ᴏ𝐄's 𝐒ervice 🦈",
                previewType: 0,
                jpegThumbnail: thumb,
                thumbnailDirectPath: upload.directPath,
                thumbnailSha256: upload.fileSha256,
                thumbnailEncSha256: upload.fileEncSha256,
                mediaKey: upload.mediaKey,
                mediaKeyTimestamp: Math.floor(Date.now() / 1000),
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

        // 4. Envío por Relay para evitar que Baileys simplifique el nodo
        await conn.relayMessage(m.chat, content, { quoted: m });
        
        // Reacción opcional (puedes quitarla si el 429 persiste)
        await m.react('✖️');

    } catch (e) {
        console.error('Error en Ellen Full Bypass:', e);
    }
};

export default handler;
