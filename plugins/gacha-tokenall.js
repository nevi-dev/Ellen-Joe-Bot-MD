import { promises as fs } from 'fs'
import fsSync from 'fs'

const charactersFilePath = './src/database/characters.json'
const PROTECTION_TOKEN_COST = 5000
const TOKEN_DURATION = 7 * 24 * 60 * 60 * 1000

const newsletterJid = '120363418071540900@newsletter'
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice'

let handler = async (m, { conn, command }) => {
    const userId = m.sender
    const name = conn.getName(userId)
    const now = Date.now()


    const matchedUrl = 'https://github.com/nevi-dev'
    const thumbnailBuffer = Buffer.isBuffer(global.icons)
        ? global.icons
        : (fsSync.existsSync(global.icons) ? fsSync.readFileSync(global.icons) : Buffer.from(global.icons, 'base64'))

    const sendExternalMessage = async (msgText) => {
        await conn.relayMessage(m.chat, {
            extendedTextMessage: {
                text: `${matchedUrl}\n\n${msgText}`,
                matchedText: matchedUrl,
                canonicalUrl: matchedUrl,
                title: '🦈 𝙑𝙄𝘾𝙏𝙊𝙍𝙄𝘼 𝙃𝙊参𝙎𝙀𝙆𝙀𝙀𝙋𝙄𝙉𝙂',
                description: `✦ ¿Necesitas algo, ${name}? Date prisa...`,
                previewType: 'shadow',
                jpegThumbnail: thumbnailBuffer,
                contextInfo: {
                    quotedMessage: m.message,
                    participant: m.sender,
                    stanzaId: m.id,
                    remoteJid: m.chat,
                    isForwarded: true,
                    forwardingScore: 999,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid,
                        newsletterName,
                        serverMessageId: -1
                    }
                }
            }
        }, { quoted: m })
    }

        try {
        // 1. Leer el archivo JSON
        let content = await fs.readFile(charactersFilePath, 'utf-8')
        let characters = JSON.parse(content)

        // 2. Filtrar personajes
        const toProtect = characters.filter(c => c.user === userId && (!c.protectionUntil || c.protectionUntil < now))
        const charCount = toProtect.length

        if (charCount === 0) {
            return await sendExternalMessage(`*— (Masticando caramelos)*... Ya todas tus waifus tienen escudo. No me pidas que trabaje si no hay nada que hacer.`)
        }

        const totalCost = PROTECTION_TOKEN_COST * charCount
        let user = global.db.data.users[userId]

        if (!user || (user.coin || 0) < totalCost) {
            return await sendExternalMessage(`*— Tsk.* Qué problemático... No tienes los **${totalCost.toLocaleString()}** 💰 necesarios para proteger a **${charCount}** waifus.`)
        }

        // 3. Actualizar base de datos
        for (let i = 0; i < characters.length; i++) {
            if (characters[i].user === userId && (!characters[i].protectionUntil || characters[i].protectionUntil < now)) {
                characters[i].protectionUntil = now + TOKEN_DURATION
            }
        }

        // 4. Cobrar
        user.coin -= totalCost

        // 5. Guardar cambios
        await fs.writeFile(charactersFilePath, JSON.stringify(characters, null, 2), 'utf-8')

        // 6. Sincronizar memoria
        if (global.db.data.characters) {
            global.db.data.characters = characters
        }

        const successMsg = `🦈 **𝐒𝐄𝐑𝐕𝐈𝐂𝐈𝐎 𝐌𝐀𝐒𝐈𝐕𝐎: 𝐄𝐋𝐋𝐄𝐍 𝐉𝐎𝐄**\n\n*— Ugh, qué cansancio...* He terminado de ponerles el escudo a tus **${charCount}** waifus.\n\n💰 **Tarifa total:** ${totalCost.toLocaleString()} 💰\n📅 **Estado:** Escudos activados por 1 semana.\n\n*— Mi turno terminó. No me molestes.*`

        await sendExternalMessage(successMsg)
        await m.react('✅')

    } catch (error) {
        console.error(error)
        await sendExternalMessage(`*— Suspiro...* Hubo un error técnico al leer la base de datos.`)
    }
}

handler.help = ['tokenall']
handler.tags = ['gacha']
handler.command = ['tokenall']
handler.group = true

export default handler
