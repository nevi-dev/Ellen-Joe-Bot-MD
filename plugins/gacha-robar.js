import { promises as fs } from 'fs'

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
    const name = conn.getName(thiefId)
    const now = Date.now()
    const isAdminAbuse = !!global.adminAbuse // Detecta si el evento está activo

    const contextInfo = {
        mentionedJid: [thiefId],
        isForwarded: true,
        forwardingScore: 999,
        forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 },
        externalAdReply: {
            title: isAdminAbuse ? '🦈 𝘼𝘿𝙈𝙄𝙉 𝘼𝘽𝙐𝙎𝙀: 𝙍𝙊𝘽𝙊 𝙄𝙇𝙄𝙈𝙄𝙏𝘼𝘿𝙊' : '🦈 𝙑𝙄𝘾𝙏𝙊𝙍𝙄𝘼 𝙃𝙊𝙐𝙎𝙀𝙆𝙀𝙀𝙋𝙄𝙉𝙂',
            body: isAdminAbuse ? '— Extracción prioritaria activa' : `— Operación de Extracción para ${name}`,
            thumbnail: global.icons,
            sourceUrl: global.redes,
            mediaType: 1,
            renderLargerThumbnail: false
        }
    }

    // 1. VERIFICAR COOLDOWN (Se ignora en Admin Abuse)
    if (!isAdminAbuse && stealCooldowns[thiefId] && now < stealCooldowns[thiefId]) {
        const remainingTime = Math.ceil((stealCooldowns[thiefId] - now) / 1000)
        return await conn.reply(m.chat, `*— Oye, relájate.* Estás agotado. Ve a descansar **${Math.floor(remainingTime / 3600)}h** más o no podré ayudarte.`, m, { contextInfo })
    }

    if (!args[0]) return await conn.reply(m.chat, `*— (Bostezo)*... Si quieres que asalte a alguien, dime el ID o nombre.`, m, { contextInfo })
    const input = args.join(' ').toLowerCase().trim()

    try {
        const characters = await loadCharacters()
        const targetIndex = characters.findIndex(c => c.id == input || c.name.toLowerCase() === input)
        const waifu = characters[targetIndex]

        if (!waifu) return await conn.reply(m.chat, `*— ¿Eh?* Esa waifu no existe. Qué pereza.`, m, { contextInfo })
        if (!waifu.user) return await conn.reply(m.chat, `*— Escucha...* No tiene dueño. No puedo robar algo que es libre.`, m, { contextInfo })
        
        const ownerId = waifu.user
        if (thiefId === ownerId) return await conn.reply(m.chat, `*— ¿Estás bien?* Esa waifu ya es tuya. No me hagas perder el tiempo.`, m, { contextInfo })

        // 2. VERIFICAR ESCUDO (Respetado siempre)
        if (waifu.protectionUntil && waifu.protectionUntil > now) {
            const timeLeft = waifu.protectionUntil - now
            const h = Math.floor(timeLeft / 3600000)
            const min = Math.floor((timeLeft % 3600000) / 60000)
            return await conn.reply(m.chat, `*— Tsk, olvídalo.* Tiene un escudo activo. Faltan **${h}h ${min}m** para que expire. No pienso pelear contra mis colegas.`, m, { contextInfo })
        }

        const uThief = global.db.data.users[thiefId] || { level: 1, health: 100 }
        const uOwner = global.db.data.users[ownerId] || { level: 1 }

        // 3. VERIFICAR SALUD (Ignorado en Admin Abuse)
        const currentHealth = uThief.health ?? 100
        if (!isAdminAbuse && currentHealth < HEALTH_REQUIRED) {
            return await conn.reply(m.chat, `*— Estás hecho un desastre.* Tienes **${currentHealth} HP** y exijo al menos **${HEALTH_REQUIRED} HP**.`, m, { contextInfo })
        }

        // 4. PROBABILIDAD (Aumentada en Admin Abuse)
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

            contextInfo.mentionedJid.push(ownerId)
            const successText = isAdminAbuse 
                ? `🦈 **¡𝐄𝐗𝐓𝐑𝐀𝐂𝐂𝐈𝐎́𝐍 𝐄𝐗𝐈𝐓𝐎𝐒𝐀!**\n\n*— Aproveché el caos actual.* He sacado a **${waifu.name}** de las manos de @${ownerId.split('@')[0]}.`
                : `🦈 **𝐎𝐏𝐄𝐑𝐀𝐂𝐈𝐎́𝐍 𝐄𝐗𝐈𝐓𝐎𝐒𝐀**\n\n*— Fue fácil.* He sacado a **${waifu.name}** de las manos de @${ownerId.split('@')[0]}. Ahora es tuya.`
            
            await conn.reply(m.chat, successText, m, { contextInfo })
        } else {
            if (!isAdminAbuse) uThief.health = Math.max(0, currentHealth - HEALTH_LOSS_ON_FAIL)
            
            const failText = isAdminAbuse
                ? `🚑 **𝐅𝐀𝐋𝐋𝐀𝐒𝐓𝐄...**\n\n*— El dueño se defendió.* Pero por el evento no me dolió tanto. ¡Sigue intentando!`
                : `🚑 **¡𝐀𝐔𝐂𝐇! 𝐍𝐎𝐒 𝐏𝐈𝐋𝐋𝐀𝐑𝐎𝐍...**\n\n*— Tsk, se defendió mejor de lo esperado.* Me voy a mi descanso.`

            await conn.reply(m.chat, failText, m, { contextInfo })
        }

    } catch (e) { console.error(e) }
}

handler.help = ['robarwaifu']
handler.tags = ['gacha']
handler.command = ['robarwaifu']
handler.group = true
export default handler
