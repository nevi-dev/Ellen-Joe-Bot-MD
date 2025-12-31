import { promises as fs } from 'fs'

// --- RUTAS DE ARCHIVOS ---
const charactersFilePath = './src/database/characters.json'
const usersFilePath = './src/database/database.json' 

// --- CONFIGURACIÓN DEL SISTEMA ---
const stealCooldowns = {} 
const STEAL_COOLDOWN_TIME = 8 * 60 * 60 * 1000 // 8 horas de espera
const HEALTH_REQUIRED = 40 // Mínimo de salud para intentar el robo
const HEALTH_LOSS_ON_FAIL = 20 // Salud que pierdes si fallas el robo
const XP_LOSS_PERCENT = 0.03 // Pierdes 3% de tu XP si fallas

// ==========================================================
//                   FUNCIONES DE BASE DE DATOS
// ==========================================================

async function loadCharacters() {
    try {
        const data = await fs.readFile(charactersFilePath, 'utf-8')
        return JSON.parse(data)
    } catch (error) {
        throw new Error('❀ Error al cargar characters.json.')
    }
}

async function saveCharacters(characters) {
    try {
        await fs.writeFile(charactersFilePath, JSON.stringify(characters, null, 2), 'utf-8')
    } catch (error) {
        throw new Error('❀ Error al guardar characters.json.')
    }
}

async function loadUsersData() {
    try {
        const data = await fs.readFile(usersFilePath, 'utf-8')
        const parsed = JSON.parse(data)
        return parsed.users || {} 
    } catch (error) {
        return {}
    }
}

async function saveUsersData(users) {
    try {
        const dataToSave = { users: users }
        await fs.writeFile(usersFilePath, JSON.stringify(dataToSave, null, 2), 'utf-8')
    } catch (error) {
        throw new Error('❀ Error al guardar database.json.')
    }
}

// ==========================================================
//                 HANDLER #ROBARWAIFU
// ==========================================================

let handler = async (m, { conn, args }) => {
    const thiefId = m.sender
    const now = Date.now()

    // 1. Verificar Cooldown
    if (stealCooldowns[thiefId] && now < stealCooldowns[thiefId]) {
        const remainingTime = Math.ceil((stealCooldowns[thiefId] - now) / 1000)
        const hours = Math.floor(remainingTime / 3600)
        const minutes = Math.floor((remainingTime % 3600) / 60)
        return await conn.reply(m.chat, `🩹 Estás herido y cansado. Debes descansar **${hours}h y ${minutes}m** más antes de otro asalto.`, m)
    }

    if (!args[0]) {
        return await conn.reply(m.chat, `《✧》Debes poner el ID o nombre. Ejemplo: *#robarwaifu 113*`, m)
    }

    const input = args.join(' ').toLowerCase().trim()

    try {
        const characters = await loadCharacters()
        const users = await loadUsersData()

        const targetIndex = characters.findIndex(c => c.id == input || c.name.toLowerCase() === input)
        const waifu = characters[targetIndex]

        if (!waifu) {
            return await conn.reply(m.chat, `《✧》No encontré a la waifu *${input}*.`, m)
        }

        if (!waifu.user) {
            return await conn.reply(m.chat, `《✧》*${waifu.name}* no tiene dueño. ¡Usa *#rw* para intentar capturarla!`, m)
        }

        const ownerId = waifu.user
        if (thiefId === ownerId) {
            return await conn.reply(m.chat, `¡Esa waifu ya es tuya! No tiene sentido robártela a ti mismo.`, m)
        }

        // --- NUEVA VALIDACIÓN: TOKEN DE PROTECCIÓN ---
        if (waifu.protectionUntil && waifu.protectionUntil > now) {
            const expirationDate = new Date(waifu.protectionUntil).toLocaleString('es-ES', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            
            return await conn.reply(m.chat, `🛡️ **¡ATAQUE BLOQUEADO!**\n\n**${waifu.name}** está protegida por un escudo divino activo.\nSu dueño ha comprado protección contra robos.\n\n📅 **Expira el:** ${expirationDate}\n_¡Inténtalo de nuevo cuando se le acabe el token!_`, m)
        }
        // ----------------------------------------------

        // Obtener datos de los usuarios involucrados
        const uThief = users[thiefId] || { level: 1, exp: 0, health: 100 }
        const uOwner = users[ownerId] || { level: 1, exp: 0 }

        // 2. Verificar Salud del Ladrón
        const currentHealth = uThief.health ?? 100
        if (currentHealth < HEALTH_REQUIRED) {
            return await conn.reply(m.chat, `🏥 **Salud insuficiente.** Tienes **${currentHealth} HP** y necesitas al menos **${HEALTH_REQUIRED} HP** para pelear contra el dueño actual.`, m)
        }

        // 3. Lógica de Probabilidad (Basada en Niveles)
        let successChance = 35 // Probabilidad base
        const levelDiff = (uThief.level || 1) - (uOwner.level || 1)

        // Cada nivel de diferencia a favor da +5%, en contra quita -5%
        successChance += (levelDiff * 5)
        successChance = Math.max(5, Math.min(85, successChance)) // Límite entre 5% y 85%

        const isSuccessful = Math.random() * 100 < successChance

        // Aplicar Cooldown obligatorio tras el intento
        stealCooldowns[thiefId] = now + STEAL_COOLDOWN_TIME

        if (isSuccessful) {
            // --- CASO DE ÉXITO ---
            characters[targetIndex].user = thiefId
            delete characters[targetIndex].protectionUntil // Se borra la protección vieja si existía (aunque ya expiró para llegar aquí)

            await saveCharacters(characters)

            const successMsg = `🥷 **¡ASALTO EXITOSO!** 🥷\n\nHas vencido a @${ownerId.split('@')[0]} en un duelo de habilidades y te has llevado a **${waifu.name}**.\n\n📊 **Probabilidad:** ${successChance.toFixed(1)}%\n❤️ **Tu Salud:** ${currentHealth} HP`
            await conn.reply(m.chat, successMsg, m, { mentions: [ownerId, thiefId] })

        } else {
            // --- CASO DE FRACASO ---
            // Restar Salud
            users[thiefId].health = Math.max(0, currentHealth - HEALTH_LOSS_ON_FAIL)

            // Restar un poco de EXP por la derrota
            const xpLost = Math.floor((uThief.exp || 0) * XP_LOSS_PERCENT)
            users[thiefId].exp = Math.max(0, (uThief.exp || 0) - xpLost)

            await saveUsersData(users)

            const failMsg = `🚑 **¡DERROTADO!** 🚑\n\nIntentaste robar a **${waifu.name}**, pero @${ownerId.split('@')[0]} se defendió ferozmente.\n\n🔻 **Salud:** -${HEALTH_LOSS_ON_FAIL} HP (Te queda: ${users[thiefId].health})\n🔻 **Experiencia:** -${xpLost}\n\n_¡Mejora tu nivel para tener más oportunidad!_`
            await conn.reply(m.chat, failMsg, m, { mentions: [ownerId] })
        }

    } catch (error) {
        console.error(error)
        await conn.reply(m.chat, `✘ Error en el sistema de robo: ${error.message}`, m)
    }
}

handler.help = ['robarwaifu <ID/Nombre>']
handler.tags = ['gacha']
handler.command = ['robarwaifu']
handler.group = true

export default handler
