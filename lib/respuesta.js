const handler = async (type, conn, m, comando) => {
    const thumbnail = global.icons; // Tu Buffer de Ellen

    const msgText = {
        rowner: `『🦈』¿Intentando usar *${comando}*? Solo mi Creador puede tocar mi cola de tiburón. Aléjate.\n\n${redes}`,
        owner: `『⚙️』Comando exclusivo para Owners. No insistas, tengo un batido que terminar. 🙄\n\n${redes}`,
        admin: `『👑』Solo los Admins pueden usar *${comando}*. Tú eres un cliente más. 💁‍♀️\n\n${redes}`,
        // ... (el resto de tus frases igual)
    }[type];

    if (msgText) {
        const content = {
            extendedTextMessage: {
                text: msgText,
                matchedText: redes,
                description: "🦈 ¡SERVICIO DENEGADO! 🦈",
                title: packname,
                previewType: 0, 
                jpegThumbnail: thumbnail, // Única fuente de imagen
                contextInfo: {
                    mentionedJid: [m.sender],
                    isForwarded: true,
                    forwardingScore: 999,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid,
                        newsletterName,
                        serverMessageId: -1
                    }
                }
            }
        };

        // Eliminamos los SHA y directPath del ejemplo que causan el bug visual
        await conn.relayMessage(m.chat, content, { quoted: m });
        return m.react('✖️');
    }
}
