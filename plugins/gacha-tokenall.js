import { promises as fs } from 'fs'

// --- RUTAS DE ARCHIVOS ---
const charactersFilePath = './src/database/characters.json'
const usersFilePath = './src/database/database.json' 

// --- CONSTANTES ---
const PROTECTION_TOKEN_COST = 5000 // Costo POR PERSONAJE
const TOKEN_DURATION = 7 * 24 * 60 * 60 * 1000 // 1 semana

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
        const json = JSON.parse(data)
        return json.users || {} 
    } catch (error) {
        return {}
    }
}

async function saveUsersData(users) {
    try {
        await fs.writeFile(usersFilePath, JSON.stringify({ users }, null, 2), 'utf-8')
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
    users[userId].coin = (users[userId].coin || 0) + amount 
    await saveUsersData(users)
    return users[userId].coin
}

// ==========================================================
//                 HANDLER #COMPRARTOKEN (GLOBAL)
// ==========================================================

let handler = async (m, { conn }) => {
    const userId = m.sender
    const now = Date.now()

    try {
        let characters = await loadCharacters()
        
        // 1. Filtrar personajes que pertenecen al usuario
        const userCharacters = characters.filter(c => c.user === userId)
        const charCount = userCharacters.length

        if (charCount === 0) {
            return await conn.reply(m.chat, `《✧》No tienes waifus en tu colección para proteger.`, m)
        }

        // 2. Calcular Costo Total (5k * cantidad de personajes)
        const totalCost = PROTECTION_TOKEN_COST * charCount
        
        // 3. Verificar Dinero
        const userCoin = await getUserCoin(userId)
        
        if (userCoin < totalCost) {
            return await conn.reply(m.chat, `❌ **Saldo insuficiente.**\n\nTienes **${charCount}** waifus.\nCosto total: **${totalCost.toLocaleString()}** 💰 (5k c/u).\nTu saldo actual: **${userCoin.toLocaleString()}** 💰.`, m)
        }

        // 4. Aplicar protección a TODOS sus personajes
        characters = characters.map(char => {
            if (char.user === userId) {
                const currentProtection = char.protectionUntil || now
                const baseTime = currentProtection > now ? currentProtection : now
                return {
                    ...char,
                    protectionUntil: baseTime + TOKEN_DURATION
                }
            }
            return char
        })

        // 5. Guardar cambios y cobrar
        const newCoin = await updateUserCoin(userId, -totalCost)
        await saveCharacters(characters)

        await conn.reply(m.chat, `🛡️ **¡PROTECCIÓN MASIVA ACTIVADA!**\n\nHas protegido a tus **${charCount}** waifus.\n\n💰 **Cálculo:** ${charCount} x 5,000 = **${totalCost.toLocaleString()}**\n📅 **Duración:** +1 semana extra\n👛 **Saldo restante:** ${newCoin.toLocaleString()} 💰`, m)

    } catch (error) {
        console.error(error)
        await conn.reply(m.chat, `✘ Error al procesar la protección: ${error.message}`, m)
    }
}

handler.help = ['tokenall']
handler.tags = ['gacha']
handler.command = ['tokenall']
handler.group = true

export default handler
