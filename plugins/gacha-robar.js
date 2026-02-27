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
    const isAdminAbuse = global.adminAbuse // Verificamos si el evento está activo

    const contextInfo = {
        mentionedJid: [thiefId],
        isForwarded: true,
        forwardingScore: 999,
        forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 },
        externalAdReply: {
            title: isAdminAbuse ? '🦈 𝘼𝘿𝙈𝙄𝙉 𝘼𝘽𝙐𝙎𝙀: 𝙍𝙊𝘽𝙊 𝙄𝙇𝙄𝙈𝙄𝙏𝘼𝘿𝙊' : '🦈 𝙑𝙄𝘾𝙏𝙊𝙍𝙄𝘼 𝙃𝙊𝙐𝙎𝙀𝙆𝙀𝙀𝙋𝙄𝙉𝙂',
            body: `— Operación de Extracción para ${name}`,
            thumbnail: global.icons,
            sourceUrl: global.redes,
            mediaType: 1,
            renderLargerThumbnail: false
        }
    }

    // 1. VERIFICAR COOLDOWN (Se salta si hay Admin Abuse)
    if (!isAdminAbuse && stealCooldowns[thiefId] && now < stealCooldowns[thiefId]) {
        const remainingTime = Math.ceil((stealCooldowns[thiefId] - now) / 1000)
        return await conn.reply(m.chat, `*— Oye, relájate.* Ve a descansar **${Math.floor(remainingTime / 3600)}h** más.`, m, { contextInfo })
    }

    if (!args[0]) return await conn.reply(m.chat, `*— (Bostezo)*... Dime el ID o nombre.`, m, { contextInfo })
    const input = args.join(' ').toLowerCase().trim()

    try {
        const characters = await loadCharacters()
        const targetIndex = characters.findIndex(c => c.id == input || c.name.toLowerCase() === input)
        const waifu = characters[targetIndex]

        if (!waifu) return await conn.reply(m.chat, `*— ¿Eh?* Esa waifu no existe.`, m, { contextInfo })
        if (!waifu.user) return await conn.reply(m.chat, `*— Escucha...* No tiene dueño. Usa #rw.`, m, { contextInfo })
        
        const ownerId = waifu.user
        if (thiefId === ownerId) return await conn.reply(m.chat, `*— ¿Estás bien?* Ya es tuya.`, m, { contextInfo })

        // 2. VERIFICAR ESCUDO (ESTO NUNCA SE SALTA, NI EN ADMIN ABUSE)
        if (waifu.protectionUntil && waifu.protectionUntil > now) {
            const timeLeft = waifu.protectionUntil - now
            const h = Math.floor(timeLeft / 3600000)
            const min = Math.floor((timeLeft % 3600000) / 60000)
            return await conn.reply(m.chat, `*— Tsk, tiene un escudo activo.* Faltan **${h}h ${min}m** para que expire. Ni con Admin Abuse puedo tocarla.`, m, { contextInfo })
        }

        const uThief = global.db.data.users[thiefId] || { level: 1, health: 100 }
        const uOwner = global.db.data.users[ownerId] || { level: 1 }

        // 3. VERIFICAR SALUD (Se salta si hay Admin Abuse)
        const currentHealth = uThief.health ?? 100
        if (!isAdminAbuse && currentHealth < HEALTH_REQUIRED) {
            return await conn.reply(m.chat, `*— Estás hecho un desastre.* Tienes **${currentHealth} HP**.`, m, { contextInfo })
        }

        // 4. PROBABILIDAD (En Admin Abuse la probabilidad es MAYOR)
        let successChance = isAdminAbuse ? 70 : 35 
        const levelDiff = (uThief.level || 1) - (uOwner.level || 1)
        successChance += (levelDiff * 5)
        successChance = Math.max(5, Math.min(95, successChance)) 

        const isSuccessful = Math.random() * 100 < successChance
        
        // Solo aplicamos cooldown si NO es admin abuse
        if (!isAdminAbuse) stealCooldowns[thiefId] = now + STEAL_COOLDOWN_TIME

        if (isSuccessful) {
            characters[targetIndex].user = thiefId
            delete characters[targetIndex].protectionUntil 
            await saveCharacters(characters)

            contextInfo.mentionedJid.push(ownerId)
            await conn.reply(m.chat, `🦈 **¡ROBO EXITOSO!**\n\n*— Aproveché el caos del Admin Abuse.* He sacado a **${waifu.name}** de las manos de @${ownerId.split('@')[0]}.`, m, { contextInfo })
        } else {
            // En Admin Abuse NO pierdes salud al fallar
            if (!isAdminAbuse) uThief.health = Math.max(0, currentHealth - HEALTH_LOSS_ON_FAIL)
            
            await conn.reply(m.chat, `🚑 **FALLASTE...**\n\n*— El dueño se defendió.* ${isAdminAbuse ? 'Pero como hay Admin Abuse, no te dolió tanto. ¡Sigue intentando!' : 'Me voy a descansar.'}`, m, { contextInfo })
        }

    } catch (e) { console.error(e) }
}

handler.help = ['robarwaifu']
handler.tags = ['gacha']
handler.command = ['robarwaifu']
handler.group = true
export default handler
