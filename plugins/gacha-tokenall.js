import { promises as fs } from 'fs'

const charactersFilePath = './src/database/characters.json'
const PROTECTION_TOKEN_COST = 5000 
const TOKEN_DURATION = 7 * 24 * 60 * 60 * 1000 

const newsletterJid = '120363418071540900@newsletter'
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice'

let handler = async (m, { conn }) => {
    const userId = m.sender
    const name = conn.getName(userId)
    const now = Date.now()

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
            body: `— Orden masiva para ${name}`,
            thumbnail: icons, 
            sourceUrl: redes, 
            mediaType: 1,
            renderLargerThumbnail: false
        }
    }

    try {
        // 1. Leer el archivo JSON
        let content = await fs.readFile(charactersFilePath, 'utf-8')
        let characters = JSON.parse(content)
        
        // 2. Filtrar los personajes que le pertenecen al usuario y no tienen protección activa
        const toProtect = characters.filter(c => c.user === userId && (!c.protectionUntil || c.protectionUntil < now))
        const charCount = toProtect.length

        if (charCount === 0) {
            return await conn.reply(m.chat, `*— (Masticando caramelos)*... Ya todas tus waifus tienen escudo. No me pidas que trabaje si no hay nada que hacer.`, m, { contextInfo })
        }

        const totalCost = PROTECTION_TOKEN_COST * charCount
        let user = global.db.data.users[userId]
        
        if (!user || (user.coin || 0) < totalCost) {
            return await conn.reply(m.chat, `*— Tsk.* Qué problemático... No tienes los **${totalCost.toLocaleString()}** 💰 necesarios para proteger a **${charCount}** waifus.`, m, { contextInfo })
        }

        // 3. ACTUALIZACIÓN CRÍTICA: Modificar el array original
        // Usamos un bucle for tradicional para asegurar que modificamos las referencias correctas
        for (let i = 0; i < characters.length; i++) {
            if (characters[i].user === userId && (!characters[i].protectionUntil || characters[i].protectionUntil < now)) {
                characters[i].protectionUntil = now + TOKEN_DURATION
            }
        }

        // 4. Cobrar al usuario
        user.coin -= totalCost

        // 5. SOBREESCRIBIR EL ARCHIVO JSON
        // Es vital usar null, 2 para mantener el formato legible que suele leer el harem
        await fs.writeFile(charactersFilePath, JSON.stringify(characters, null, 2), 'utf-8')

        // 6. Sincronizar con la memoria por si acaso otros comandos usan la RAM
        if (global.db.data.characters) {
            global.db.data.characters = characters
        }

        const successMsg = `🦈 **𝐒𝐄𝐑𝐕𝐈𝐂𝐈𝐎 𝐌𝐀𝐒𝐈𝐕𝐎: 𝐄𝐋𝐋𝐄𝐍 𝐉𝐎𝐄**\n\n*— Ugh, qué cansancio...* He terminado de ponerles el escudo a tus **${charCount}** waifus.\n\n💰 **Tarifa total:** ${totalCost.toLocaleString()} 💰\n📅 **Estado:** Escudos activados por 1 semana.\n\n*— Mi turno terminó. No me molestes.*`

        await conn.reply(m.chat, successMsg, m, { contextInfo })

    } catch (error) {
        console.error(error)
        await conn.reply(m.chat, `*— Suspiro...* Hubo un error técnico al leer la base de datos.`, m, { contextInfo })
    }
}

handler.help = ['tokenall']
handler.tags = ['gacha']
handler.command = ['tokenall']
handler.group = true

export default handler
