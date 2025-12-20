import { promises as fs } from 'fs'

// --- RUTAS DE ARCHIVOS ---
const charactersFilePath = './src/database/characters.json'
const usersFilePath = './src/database/database.json' 

// --- CONSTANTES ACTUALIZADAS ---
const PROTECTION_TOKEN_COST = 5000 // Costo más caro (5K de coin)
const TOKEN_DURATION = 7 * 24 * 60 * 60 * 1000 // Duración: Exactamente 1 semana

// ==========================================================
//                   FUNCIONES INTERNAS DE DB
// ==========================================================

async function loadCharacters() {
    try {
        const data = await fs.readFile(charactersFilePath, 'utf-8')
        return JSON.parse(data)
    } catch (error) {
        throw new Error('❀ No se pudo cargar el archivo characters.json.')
    }
}

async function saveCharacters(characters) {
    try {
        await fs.writeFile(charactersFilePath, JSON.stringify(characters, null, 2), 'utf-8')
    } catch (error) {
        throw new Error('❀ No se pudo guardar el archivo characters.json.')
    }
}

async function loadUsersData() {
    try {
        const data = await fs.readFile(usersFilePath, 'utf-8')
        return JSON.parse(data).users || {} 
    } catch (error) {
        console.error('Error al cargar database.json:', error);
        return {}
    }
}

async function saveUsersData(users) {
    try {
        const dataToSave = { users: users }; 
        await fs.writeFile(usersFilePath, JSON.stringify(dataToSave, null, 2), 'utf-8')
    } catch (error) {
        throw new Error('❀ No se pudo guardar el archivo database.json.')
    }
}

async function getUserCoin(userId) {
    const users = await loadUsersData()
    return users[userId]?.coin || 0 
}

async function updateUserCoin(userId, amount) {
    const users = await loadUsersData()
    if (!users[userId]) users[userId] = {}

    const currentCoin = users[userId].coin || 0
    users[userId].coin = currentCoin + amount 

    await saveUsersData(users)
    return users[userId].coin
}

// ==========================================================
//                 HANDLER #COMPRARTOKEN
// ==========================================================

let handler = async (m, { conn, args }) => {
    const userId = m.sender
    const now = Date.now()

    if (args.length === 0) {
        return await conn.reply(m.chat, `《✧》Debes proporcionar el ID o el nombre de la waifu que quieres proteger.\nEjemplo: *#comprartoken 113*`, m)
    }

    const input = args.join(' ').toLowerCase().trim()

    try {
        const characters = await loadCharacters()
        const targetIndex = characters.findIndex(c => c.id == input || c.name.toLowerCase() === input)
        const targetCharacter = characters[targetIndex]

        if (!targetCharacter) {
            return await conn.reply(m.chat, `《✧》No se encontró a la waifu *${input}*.`, m)
        }

        // 1. Verificar Posesión
        if (targetCharacter.user !== userId) {
            const ownerTag = targetCharacter.user ? `@${targetCharacter.user.split('@')[0]}` : 'nadie'
            return await conn.reply(m.chat, `《✧》Solo puedes proteger waifus que te pertenezcan. *${targetCharacter.name}* es de ${ownerTag}.`, m, { mentions: targetCharacter.user ? [targetCharacter.user] : [] })
        }

        // 2. Verificar Dinero (5,000 monedas)
        const userCoin = await getUserCoin(userId)
        if (userCoin < PROTECTION_TOKEN_COST) {
            return await conn.reply(m.chat, `❌ **Saldo insuficiente.**\n\nEl Token de Protección Semanal cuesta **${PROTECTION_TOKEN_COST.toLocaleString()}** 💰.\nTu saldo actual: **${userCoin.toLocaleString()}** 💰.`, m)
        }

        // 3. Aplicar/Extender Protección
        // Si ya tiene protección, se le suma la semana a la fecha de expiración actual
        const currentProtection = targetCharacter.protectionUntil || now
        const baseTime = currentProtection > now ? currentProtection : now
        characters[targetIndex].protectionUntil = baseTime + TOKEN_DURATION

        // 4. Deduce el costo y guarda
        const newCoin = await updateUserCoin(userId, -PROTECTION_TOKEN_COST)
        await saveCharacters(characters)

        const expirationDate = new Date(characters[targetIndex].protectionUntil).toLocaleString('es-ES', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })

        await conn.reply(m.chat, `🛡️ **¡PROTECCIÓN ADQUIRIDA!**\n\nHas protegido a **${targetCharacter.name}** contra intentos de robo.\n\n📅 **Expira el:** ${expirationDate}\n💰 **Costo:** ${PROTECTION_TOKEN_COST.toLocaleString()}\n👛 **Saldo restante:** ${newCoin.toLocaleString()} 💰`, m)

    } catch (error) {
        await conn.reply(m.chat, `✘ Error al comprar el token: ${error.message}`, m)
    }
}

handler.help = ['comprartoken <ID/Nombre>']
handler.tags = ['gacha']
handler.command = ['comprartoken', 'buytoken', 'proteccion']
handler.group = true

export default handler
