import { promises as fs } from 'fs'

// --- RUTAS DE ARCHIVOS ---
const charactersFilePath = './src/database/characters.json'
const usersFilePath = './src/database/database.json' 

// --- CONSTANTES ---
const PROTECTION_TOKEN_COST = 1000 // Costo del token (1K de coin)
const TOKEN_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 días de protección

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
        // En un entorno real, manejar este error es crítico.
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
        return await conn.reply(m.chat, `《✧》Debes proporcionar el ID o el nombre de la waifu que quieres proteger. Ejemplo: *#comprartoken Aika Sano*`, m)
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
            const ownerTag = targetCharacter.user ? `@${targetCharacter.user.split('@')[0]}` : 'nadie (está libre)'
            return await conn.reply(m.chat, `《✧》Solo puedes proteger waifus que te pertenezcan. *${targetCharacter.name}* es de ${ownerTag}.`, m, { mentions: targetCharacter.user ? [targetCharacter.user] : [] })
        }
        
        // 2. Verificar Dinero
        const userCoin = await getUserCoin(userId)
        if (userCoin < PROTECTION_TOKEN_COST) {
            return await conn.reply(m.chat, `¡Necesitas *${PROTECTION_TOKEN_COST.toLocaleString()}* 💰 para comprar un Token de Protección para **${targetCharacter.name}**! Solo tienes *${userCoin.toLocaleString()}* 💰.`, m)
        }

        // 3. Aplicar Protección
        characters[targetIndex].protectionUntil = now + TOKEN_DURATION
        
        // 4. Deduce el costo y guarda
        const newCoin = await updateUserCoin(userId, -PROTECTION_TOKEN_COST)
        await saveCharacters(characters)
        
        const expirationDate = new Date(characters[targetIndex].protectionUntil).toLocaleDateString('es-ES')
        
        await conn.reply(m.chat, `🛡️ ¡Has comprado un **Token de Protección**! **${targetCharacter.name}** estará a salvo de robos hasta el *${expirationDate}*.\n\n_Tu nuevo saldo es: *${newCoin.toLocaleString()}* 💰._`, m)

    } catch (error) {
        await conn.reply(m.chat, `✘ Error al comprar el token: ${error.message}`, m)
    }
}

handler.help = ['comprartoken <ID/Nombre>']
handler.tags = ['gacha']
handler.command = ['comprartoken', 'buytoken', 'proteccion']
handler.group = true

export default handler
