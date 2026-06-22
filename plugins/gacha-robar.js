import { promises as fs } from 'fs'
import fsSync from 'fs'

const charactersFilePath = './src/database/characters.json'
const stealCooldowns = {}
const STEAL_COOLDOWN_TIME = 5 * 60 * 60 * 1000
const HEALTH_REQUIRED = 50
const HEALTH_LOSS_ON_FAIL = 20

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
    const thiefId = m.sender
    const name = await conn.getName(thiefId)
    const now = Date.now()
    const isAdminAbuse = !!global.adminAbuse


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

        // 1. VERIFICAR COOLDOWN
    if (!isAdminAbuse && stealCooldowns[thiefId] && now < stealCooldowns[thiefId]) {
        const remainingTime = Math.ceil((stealCooldowns[thiefId] - now) / 1000)
        return await sendExternalMessage(`*— Oye, relájate.* Estás agotado. Ve a descansar **${Math.floor(remainingTime / 3600)}h** más o no podré ayudarte.`)
    }

    if (!args[0]) return await sendExternalMessage(`*— (Bostezo)*... Si quieres que asalte a alguien, dime el ID o nombre.`)
    const input = args.join(' ').toLowerCase().trim()

    try {
        const characters = await loadCharacters()
        const targetIndex = characters.findIndex(c => c.id == input || c.name.toLowerCase() === input)
        const waifu = characters[targetIndex]

        if (!waifu) return await sendExternalMessage(`*— ¿Eh?* Esa waifu no existe. Qué pereza.`)
        if (!waifu.user) return await sendExternalMessage(`*— Escucha...* No tiene dueño. No puedo robar algo que es libre.`)

        const ownerId = waifu.user
        if (thiefId === ownerId) return await sendExternalMessage(`*— ¿Estás bien?* Esa waifu ya es tuya. No me hagas perder el tiempo.`)

        // 2. VERIFICAR ESCUDO
        if (waifu.protectionUntil && waifu.protectionUntil > now) {
            const timeLeft = waifu.protectionUntil - now
            const h = Math.floor(timeLeft / 3600000)
            const min = Math.floor((timeLeft % 3600000) / 60000)
            return await sendExternalMessage(`*— Tsk, olvídalo.* Tiene un escudo activo. Faltan **${h}h ${min}m** para que expire. No pienso pelear contra mis colegas.`)
        }

        const uThief = global.db.data.users[thiefId] || { level: 1, health: 100 }
        const uOwner = global.db.data.users[ownerId] || { level: 1 }

        // 3. VERIFICAR SALUD
        const currentHealth = uThief.health ?? 100
        if (!isAdminAbuse && currentHealth < HEALTH_REQUIRED) {
            return await sendExternalMessage(`*— Estás hecho un desastre.* Tienes **${currentHealth} HP** y exijo al menos **${HEALTH_REQUIRED} HP**.`)
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

            await sendExternalMessage(successText, [ownerId])
            await m.react('✅')
        } else {
            if (!isAdminAbuse) uThief.health = Math.max(0, currentHealth - HEALTH_LOSS_ON_FAIL)

            const failText = isAdminAbuse
                ? `🚑 **𝐅𝐀𝐋𝐋𝐀𝐒𝐓𝐄...**\n\n*— El dueño se defendió.* Pero por el evento no me dolió tanto. ¡Sigue intentando!`
                : `🚑 **¡𝐀𝐔𝐂𝐇! 𝐍𝐎𝐒 𝐏𝐈𝐋𝐋𝐀𝐑𝐎𝐍...**\n\n*— Tsk, se defendió mejor de lo esperado.* Me voy a mi descanso.`

            await sendExternalMessage(failText)
            await m.react('❌')
        }

    } catch (e) {
        console.error(e)
        await sendExternalMessage(`*— Suspiro...* Hubo un error técnico al leer la base de datos.`)
    }
}

handler.help = ['robarwaifu']
handler.tags = ['gacha']
handler.command = ['robarwaifu']
handler.group = true

export default handler
