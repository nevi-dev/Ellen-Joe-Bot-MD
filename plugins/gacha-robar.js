import { promises as fs } from 'fs'

// --- RUTAS DE ARCHIVOS ---
const charactersFilePath = './src/database/characters.json'
const usersFilePath = './src/database/database.json' 

// --- CONFIGURACIÓN DEL SISTEMA ---
const stealCooldowns = {} 
const STEAL_COOLDOWN_TIME = 5 * 60 * 60 * 1000 // 8 horas
const HEALTH_REQUIRED = 50 // ACTUALIZADO: Mínimo de salud para intentar el robo
const HEALTH_LOSS_ON_FAIL = 20 
const XP_LOSS_PERCENT = 0.03 

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
//                HANDLER #ROBARWAIFU (ELLEN JOE)
// ==========================================================

let handler = async (m, { conn, args }) => {
    const thiefId = m.sender
    const now = Date.now()

    // 1. Verificar Cooldown
    if (stealCooldowns[thiefId] && now < stealCooldowns[thiefId]) {
        const remainingTime = Math.ceil((stealCooldowns[thiefId] - now) / 1000)
        const hours = Math.floor(remainingTime / 3600)
        const minutes = Math.floor((remainingTime % 3600) / 60)
        return await conn.reply(m.chat, `*— Oye, relájate.* Estás demasiado agotado para pelear. Ve a descansar **${hours}h y ${minutes}m** más o no podré ayudarte.`, m)
    }

    if (!args[0]) {
        return await conn.reply(m.chat, `*— (Bostezo)*... Si quieres que asalte a alguien, dime el ID o nombre. No voy a buscarlo yo.`, m)
    }

    const input = args.join(' ').toLowerCase().trim()

    try {
        const characters = await loadCharacters()
        const users = await loadUsersData()

        const targetIndex = characters.findIndex(c => c.id == input || c.name.toLowerCase() === input)
        const waifu = characters[targetIndex]

        if (!waifu) {
            return await conn.reply(m.chat, `*— ¿Eh?* Esa waifu no existe. Deja de inventar nombres, qué pereza.`, m)
        }

        if (!waifu.user) {
            return await conn.reply(m.chat, `*— Escucha...* **${waifu.name}** no tiene dueño. No puedo robar algo que es libre. Usa *#rw* y deja de molestar.`, m)
        }

        const ownerId = waifu.user
        if (thiefId === ownerId) {
            return await conn.reply(m.chat, `*— ¿Estás bien de la cabeza?* Esa waifu ya es tuya. No me hagas perder el tiempo con bromas.`, m)
        }

        // --- VALIDACIÓN: TOKEN DE PROTECCIÓN ---
        if (waifu.protectionUntil && waifu.protectionUntil > now) {
            return await conn.reply(m.chat, `*— Tsk, olvídalo.* **${waifu.name}** tiene un escudo de Victoria Housekeeping activo. No pienso pelear contra mis propios colegas. Inténtalo cuando expire.`, m)
        }

        // Datos del Ladrón
        const uThief = global.db.data.users[thiefId] || { level: 1, exp: 0, health: 100 }
        const uOwner = global.db.data.users[ownerId] || { level: 1, exp: 0 }

        // 2. Verificar Salud del Ladrón (REQUISITO 50 HP)
        const currentHealth = uThief.health ?? 100
        if (currentHealth < HEALTH_REQUIRED) {
            return await conn.reply(m.chat, `*— Estás hecho un desastre.* Tienes **${currentHealth} HP** y para este trabajo exijo que tengas al menos **${HEALTH_REQUIRED} HP**. Ve a curarte.`, m)
        }

        // 3. Lógica de Probabilidad
        let successChance = 35 
        const levelDiff = (uThief.level || 1) - (uOwner.level || 1)
        successChance += (levelDiff * 5)
        successChance = Math.max(5, Math.min(85, successChance)) 

        const isSuccessful = Math.random() * 100 < successChance
        stealCooldowns[thiefId] = now + STEAL_COOLDOWN_TIME

        if (isSuccessful) {
            // --- ÉXITO ---
            characters[targetIndex].user = thiefId
            delete characters[targetIndex].protectionUntil 

            await saveCharacters(characters)

            const successMsg = `🦈 **¡Trabajo terminado!**\n\n*— Fue más fácil de lo que pensé.* He sacado a **${waifu.name}** de las manos de @${ownerId.split('@')[0]}. Ahora es tuya, no me pidas nada más.\n\n📊 **Probabilidad:** ${successChance.toFixed(1)}%\n❤️ **Salud restante:** ${currentHealth} HP`
            await conn.reply(m.chat, successMsg, m, { mentions: [ownerId, thiefId] })

        } else {
            // --- FRACASO ---
            uThief.health = Math.max(0, currentHealth - HEALTH_LOSS_ON_FAIL)
            const xpLost = Math.floor((uThief.exp || 0) * XP_LOSS_PERCENT)
            uThief.exp = Math.max(0, (uThief.exp || 0) - xpLost)

            const failMsg = `🚑 **¡Auch! Nos pillaron...**\n\n*— Tsk, el dueño de **${waifu.name}** se defendió mejor de lo esperado.* Tuve que retirarme. Estás herido.\n\n🔻 **Salud:** -${HEALTH_LOSS_ON_FAIL} HP (Te queda: ${uThief.health})\n🔻 **Experiencia:** -${xpLost}\n\n*— Me voy a mi descanso. No me busques en un rato.*`
            await conn.reply(m.chat, failMsg, m, { mentions: [ownerId] })
        }

    } catch (error) {
        await conn.reply(m.chat, `*— Suspiro...* Algo salió mal con el robo: ${error.message}. Qué molesto.`, m)
    }
}

handler.help = ['robarwaifu <ID/Nombre>']
handler.tags = ['gacha']
handler.command = ['robarwaifu']
handler.group = true

export default handler
