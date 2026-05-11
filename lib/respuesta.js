import fetch from 'node-fetch';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
        // 1. ESPERA ACTIVA: Si hay rate-limit, un pequeño delay de 500ms ayuda a que el socket respire
        await delay(500);

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

        const msgText = frasesEllen[type];

        if (msgText) {
            // Reaccionamos DESPUÉS de preparar el mensaje para no saturar el socket
            await m.react('✖️');

            await conn.sendMessage(m.chat, {
                text: msgText,
                contextInfo: {
                    mentionedJid: [m.sender],
                    isForwarded: true,
                    forwardingScore: 1,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid,
                        newsletterName,
                        serverMessageId: -1
                    },
                    externalAdReply: {
                        title: "𝐄llen 𝐉ᴏ𝐄's 𝐒ervice 🦈",
                        body: "˚🄴🄻🄻🄴🄽-🄹🄾🄴-🄱🄾🅃",
                        mediaType: 2, 
                        thumbnail: thumb,
                        renderLargerThumbnail: true,
                        sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                        mediaUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                        showAdAttribution: false // Desactiva esto para que el WA Normal no sospeche
                    }
                }
            }, { quoted: m });
        }
    } catch (e) {
        console.error('Error en bypass Ellen:', e);
    }
};

export default handler;
