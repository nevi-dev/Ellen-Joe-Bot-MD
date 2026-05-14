import { promises as fs } from 'fs'
import pkg from '@whiskeysockets/baileys'
const { generateWAMessageContent } = pkg

const charactersFilePath = './src/database/characters.json'
const stealCooldowns = {} 
const STEAL_COOLDOWN_TIME = 5 * 60 * 60 * 1000 
const HEALTH_REQUIRED = 50 
const HEALTH_LOSS_ON_FAIL = 20 

const newsletterJid = '120363418071540900@newsletter'
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice'

// Array de imágenes para el bypass aleatorio
const images = [
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/086ec8e8-c373-45b6-ad51-3cdaef9cd3e6.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/c99835de-0c28-4e27-93a0-422df6cca849.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/6eee1198-1b0f-4cfe-b6c0-2fb82dc0bdc5.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/18b2ad5d-a091-4267-8903-bb895dbefe6c.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/23912e87-2b42-468c-bfd4-a4df62951c10.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/7d874ab7-8a4c-4d76-b7dc-dfbcb589bd9b.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/42f1cc96-bcd5-4c43-ac58-96883dba3047.jpg?raw=true",
    "https://github.com/nevi-dev/nevi-dev/blob/main/src/407e16b8-89d4-4d09-bd2f-a606ccc0e53c.jpg?raw=true"
]

async function loadCharacters() {
    const data = await fs.readFile(charactersFilePath, 'utf-8')
    return JSON.parse(data)
}

async function saveCharacters(characters) {
    await fs.writeFile(charactersFilePath, JSON.stringify(characters, null, 2), 'utf-8')
}

let handler = async (m, { conn, args }) => {
    const thiefId = m.sender
    const now = Date.now()
    const isAdminAbuse = !!global.adminAbuse 
    const channelUrl = typeof redes !== 'undefined' ? redes : 'https://whatsapp.com/channel/0029VbAuMiNCBtxOKcBfw71x'

    // --- FUNCIÓN PARA ENVIAR BYPASS CON IMAGEN ALEATORIA ---
    const sendBypassMsg = async (text, mentions = []) => {
        try {
            const randomImage = images[Math.floor(Math.random() * images.length)]
            const { data: thumb } = await conn.getFile(randomImage)
            const messageContent = await generateWAMessageContent(
                { image: { url: randomImage } },
                { upload: conn.waUploadToServer }
            )
            const imageMsg = messageContent.imageMessage

            const content = {
                extendedTextMessage: {
                    text: `${text}\n\n${channelUrl}`,
                    matchedText: channelUrl,
                    description: "Victoria Housekeeping Service - ZZZ",
                    title: isAdminAbuse ? '🦈 𝘼𝘿𝙈𝙄𝙉 𝘼𝘽𝙐𝙎𝙀: 𝙍𝙊𝘽𝙊 𝙄𝙇𝙄𝙈𝙄𝙏𝘼𝘿𝙊' : "𝐄llen 𝐉ᴏ𝐄's 𝐒ervice 🦈",
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
                        mentionedJid: [thiefId, ...mentions],
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
            await conn.reply(m.chat, text, m)
        }
    }

    // 1. VERIFICAR COOLDOWN
    if (!isAdminAbuse && stealCooldowns[thiefId] && now < stealCooldowns[thiefId]) {
        const remainingTime = Math.ceil((stealCooldowns[thiefId] - now) / 1000)
        return await sendBypassMsg(`*— Oye, relájate.* Estás agotado. Ve a descansar **${Math.floor(remainingTime / 3600)}h** más o no podré ayudarte.`)
    }

    if (!args[0]) return await sendBypassMsg(`*— (Bostezo)*... Si quieres que asalte a alguien, dime el ID o nombre.`)
    const input = args.join(' ').toLowerCase().trim()

    try {
        const characters = await loadCharacters()
        const targetIndex = characters.findIndex(c => c.id == input || c.name.toLowerCase() === input)
        const waifu = characters[targetIndex]

        if (!waifu) return await sendBypassMsg(`*— ¿Eh?* Esa waifu no existe. Qué pereza.`)
        if (!waifu.user) return await sendBypassMsg(`*— Escucha...* No tiene dueño. No puedo robar algo que es libre.`)
        
        const ownerId = waifu.user
        if (thiefId === ownerId) return await sendBypassMsg(`*— ¿Estás bien?* Esa waifu ya es tuya. No me hagas perder el tiempo.`)

        // 2. VERIFICAR ESCUDO
        if (waifu.protectionUntil && waifu.protectionUntil > now) {
            const timeLeft = waifu.protectionUntil - now
            const h = Math.floor(timeLeft / 3600000)
            const min = Math.floor((timeLeft % 3600000) / 60000)
            return await sendBypassMsg(`*— Tsk, olvídalo.* Tiene un escudo activo. Faltan **${h}h ${min}m** para que expire. No pienso pelear contra mis colegas.`)
        }

        const uThief = global.db.data.users[thiefId] || { level: 1, health: 100 }
        const uOwner = global.db.data.users[ownerId] || { level: 1 }

        // 3. VERIFICAR SALUD
        const currentHealth = uThief.health ?? 100
        if (!isAdminAbuse && currentHealth < HEALTH_REQUIRED) {
            return await sendBypassMsg(`*— Estás hecho un desastre.* Tienes **${currentHealth} HP** y exijo al menos **${HEALTH_REQUIRED} HP**.`)
        }

        // 4. PROBABILIDAD
        let successChance = isAdminAbuse ? 70 : 35 
        const levelDiff = (uThief.level || 1) - (uOwner.level || 1)
        successChance += (levelDiff * 5)
        successChance = Math.max(5, Math.min(95, successChance)) 

        const isSuccessful = Math.random() * 100 < successChance
        if (!isAdminAbuse) stealCooldowns[thiefId] = now + STEAL_COOLDOWN_TIME

        if (isSuccessful) {
            characters[targetIndex].user = thiefId
            delete characters[targetIndex].protectionUntil 
            await saveCharacters(characters)

            const successText = isAdminAbuse 
                ? `🦈 **¡𝐄𝐗𝐓𝐑𝐀𝐂𝐂𝐈𝐎́𝐍 𝐄𝐗𝐈𝐓𝐎𝐒𝐀!**\n\n*— Aproveché el caos actual.* He sacado a **${waifu.name}** de las manos de @${ownerId.split('@')[0]}.`
                : `🦈 **𝐎𝐏𝐄𝐑𝐀𝐂𝐈𝐎́𝐍 𝐄𝐗𝐈𝐓𝐎𝐒𝐀**\n\n*— Fue fácil.* He sacado a **${waifu.name}** de las manos de @${ownerId.split('@')[0]}. Ahora es tuya.`
            
            await sendBypassMsg(successText, [ownerId])
            await m.react('✅')
        } else {
            if (!isAdminAbuse) uThief.health = Math.max(0, currentHealth - HEALTH_LOSS_ON_FAIL)
            
            const failText = isAdminAbuse
                ? `🚑 **𝐅𝐀𝐋𝐋𝐀𝐒𝐓𝐄...**\n\n*— El dueño se defendió.* Pero por el evento no me dolió tanto. ¡Sigue intentando!`
                : `🚑 **¡𝐀𝐔𝐂𝐇! 𝐍𝐎𝐒 𝐏𝐈𝐋𝐋𝐀𝐑𝐎𝐍...**\n\n*— Tsk, se defendió mejor de lo esperado.* Me voy a mi descanso.`

            await sendBypassMsg(failText)
            await m.react('❌')
        }

    } catch (e) { 
        console.error(e) 
        await sendBypassMsg(`*— Suspiro...* Hubo un error técnico al leer la base de datos.`)
    }
}

handler.help = ['robarwaifu']
handler.tags = ['gacha']
handler.command = ['robarwaifu']
handler.group = true

export default handler
