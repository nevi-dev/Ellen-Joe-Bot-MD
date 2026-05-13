import { promises as fs } from 'fs'
import pkg from '@whiskeysockets/baileys'
const { generateWAMessageContent, proto } = pkg

const charactersFilePath = './src/database/characters.json'
const PROTECTION_TOKEN_COST = 5000 
const TOKEN_DURATION = 7 * 24 * 60 * 60 * 1000 

const newsletterJid = '120363418071540900@newsletter'
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice'

// Imagen para el bypass (puedes usar una de tus redes o iconos)
const ellenImage = "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/086ec8e8-c373-45b6-ad51-3cdaef9cd3e6.jpg"

let handler = async (m, { conn, command }) => {
    const userId = m.sender
    const name = conn.getName(userId)
    const now = Date.now()
    const channelUrl = typeof redes !== 'undefined' ? redes : 'https://whatsapp.com/channel/0029VbAuMiNCBtxOKcBfw71x'

    // --- FUNCIÓN INTERNA PARA ENVIAR EL MENSAJE CON BYPASS ---
    const sendBypassMsg = async (text) => {
        try {
            const { data: thumb } = await conn.getFile(ellenImage)
            const messageContent = await generateWAMessageContent(
                { image: { url: ellenImage } },
                { upload: conn.waUploadToServer }
            )
            const imageMsg = messageContent.imageMessage

            const content = {
                extendedTextMessage: {
                    text: `${text}\n\n${channelUrl}`,
                    matchedText: channelUrl,
                    description: "Victoria Housekeeping Service - ZZZ",
                    title: "𝐄llen 𝐉ᴏ𝐄's 𝐒ervice 🦈",
                    previewType: 0,
                    jpegThumbnail: thumb,
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
            }
            await conn.relayMessage(m.chat, content, { quoted: m })
        } catch (e) {
            console.error('Error enviando bypass:', e)
            await conn.reply(m.chat, text, m) // Fallback si falla el bypass
        }
    }

    try {
        // 1. Leer el archivo JSON
        let content = await fs.readFile(charactersFilePath, 'utf-8')
        let characters = JSON.parse(content)

        // 2. Filtrar personajes
        const toProtect = characters.filter(c => c.user === userId && (!c.protectionUntil || c.protectionUntil < now))
        const charCount = toProtect.length

        if (charCount === 0) {
            return await sendBypassMsg(`*— (Masticando caramelos)*... Ya todas tus waifus tienen escudo. No me pidas que trabaje si no hay nada que hacer.`)
        }

        const totalCost = PROTECTION_TOKEN_COST * charCount
        let user = global.db.data.users[userId]

        if (!user || (user.coin || 0) < totalCost) {
            return await sendBypassMsg(`*— Tsk.* Qué problemático... No tienes los **${totalCost.toLocaleString()}** 💰 necesarios para proteger a **${charCount}** waifus.`)
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

        await sendBypassMsg(successMsg)
        await m.react('✅')

    } catch (error) {
        console.error(error)
        await sendBypassMsg(`*— Suspiro...* Hubo un error técnico al leer la base de datos.`)
    }
}

handler.help = ['tokenall']
handler.tags = ['gacha']
handler.command = ['tokenall']
handler.group = true

export default handler
