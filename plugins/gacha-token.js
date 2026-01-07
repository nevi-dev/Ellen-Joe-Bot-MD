import { promises as fs } from 'fs'

const charactersFilePath = './src/database/characters.json'
const PROTECTION_TOKEN_COST = 5000 
const TOKEN_DURATION = 7 * 24 * 60 * 60 * 1000 

// Configuración del Newsletter/Canal
const newsletterJid = '120363418071540900@newsletter'
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice'

async function loadCharacters() {
    const data = await fs.readFile(charactersFilePath, 'utf-8')
    return JSON.parse(data)
}

async function saveCharacters(characters) {
    await fs.writeFile(charactersFilePath, JSON.stringify(characters, null, 2), 'utf-8')
}

let handler = async (m, { conn, args }) => {
    const userId = m.sender
    const name = conn.getName(userId)
    const now = Date.now()

    // ContextInfo con la personalidad de Ellen y links del bot
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
            title: '🦈 𝙑𝙄𝘾𝙏𝙊𝙍𝙄𝘼 𝙃𝙊𝙐𝙎𝙀𝙆𝙀𝙀𝙋𝙄𝙉𝙂',
            body: `— Servicio de Seguridad para ${name}`,
            thumbnail: icons, // Asegúrate de que 'icons' esté definido globalmente
            sourceUrl: redes, // Asegúrate de que 'redes' esté definido globalmente
            mediaType: 1,
            renderLargerThumbnail: false
        }
    }

    if (args.length === 0) {
        return await conn.reply(m.chat, `*— (Bostezo)*... Si quieres que trabaje extra, al menos dime el ID o el nombre de la waifu. No soy adivina.`, m, { contextInfo })
    }

    const input = args.join(' ').toLowerCase().trim()

    try {
        const characters = await loadCharacters()
        const targetIndex = characters.findIndex(c => c.id == input || c.name.toLowerCase() === input)
        const targetCharacter = characters[targetIndex]

        if (!targetCharacter) return await conn.reply(m.chat, `*— ¿Eh?* Esa waifu no existe en mis registros. No me hagas perder el tiempo.`, m, { contextInfo })
        
        if (targetCharacter.user !== userId) return await conn.reply(m.chat, `*— Escucha...* Esa waifu no es tuya. No puedo ponerle un escudo a algo que no te pertenece. Qué molestia.`, m, { contextInfo })

        // BLOQUEO SI YA TIENE TOKEN ACTIVO
        if (targetCharacter.protectionUntil && targetCharacter.protectionUntil > now) {
            return await conn.reply(m.chat, `*— Suspiro...* **${targetCharacter.name}** ya tiene un escudo puesto. No voy a gastar más energía en algo que ya está protegido. Vuelve cuando se rompa.`, m, { contextInfo })
        }

        // COBRO DE MONEDAS
        let user = global.db.data.users[userId]
        if (!user || (user.coin || 0) < PROTECTION_TOKEN_COST) {
            return await conn.reply(m.chat, `*— Tsk.* No tienes suficientes créditos. El servicio de Victoria Housekeeping cuesta **${PROTECTION_TOKEN_COST}** 💰. Vuelve cuando seas rico.`, m, { contextInfo })
        }

        // PROCESO DE PROTECCIÓN
        characters[targetIndex].protectionUntil = now + TOKEN_DURATION
        user.coin -= PROTECTION_TOKEN_COST 
        
        await saveCharacters(characters)

        const expirationDate = new Date(characters[targetIndex].protectionUntil).toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        })

        const statusMsg = `🦈 **𝐒𝐄𝐑𝐕𝐈𝐂𝐈𝐎 𝐃𝐄 𝐏𝐑𝐎𝐓𝐄𝐂𝐂𝐈𝐎́𝐍**\n\n*— Bien, ya está.* He puesto a **${targetCharacter.name}** bajo mi guardia. Nadie la tocará mientras esté de turno... supongo.\n\n📅 **Termino mi turno el:** ${expirationDate}\n💰 **Tarifa cobrada:** ${PROTECTION_TOKEN_COST.toLocaleString()} 💰\n\n*— Me voy a mi descanso, no me molestes.*`

        await conn.reply(m.chat, statusMsg, m, { contextInfo })

    } catch (error) {
        await conn.reply(m.chat, `*— Tsk, algo salió mal:* ${error.message}. Qué problemático...`, m, { contextInfo })
    }
}

handler.help = ['comprartoken <ID/Nombre>']
handler.tags = ['gacha']
handler.command = ['comprartoken', 'buytoken', 'proteccion']
handler.group = true

export default handler
