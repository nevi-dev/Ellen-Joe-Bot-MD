import { promises as fs } from 'fs'

// --- RUTAS DE ARCHIVOS ---
const charactersFilePath = './src/database/characters.json'
const usersFilePath = './src/database/database.json' 

// --- CONSTANTES ---
const stealCooldowns = {} // Cooldown para #robarwaifu
const STEAL_COOLDOWN_TIME = 12 * 60 * 60 * 1000 // 12 horas de cooldown
const STEAL_COST = 1000 // Costo por intento de robo (1,000 monedas)

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
        const seconds = remainingTime % 60
        return await conn.reply(m.chat, `( ⸝⸝･̆⤚･̆⸝⸝) ¡𝗗𝗲𝗯𝗲𝘀 𝗲𝘀𝗽𝗲𝗿𝗮𝗿 *${hours} horas, ${minutes} minutos y ${seconds} segundos* 𝗽𝗮𝗿𝗮 𝘃𝗼𝗹𝘃𝗲𝗿 𝗮 𝗿𝗼𝗯𝗮𝗿!`, m)
    }

    if (args.length === 0) {
        return await conn.reply(m.chat, `《✧》Debes proporcionar el ID o el nombre de la waifu que quieres robar. Ejemplo: *#robarwaifu 113*`, m)
    }

    const input = args.join(' ').toLowerCase().trim()
    
    try {
        const characters = await loadCharacters()
        const targetCharacter = characters.find(c => c.id == input || c.name.toLowerCase() === input)
        const targetIndex = characters.findIndex(c => c.id == input || c.name.toLowerCase() === input)

        if (!targetCharacter) {
            return await conn.reply(m.chat, `《✧》No se encontró a la waifu *${input}*.`, m)
        }

        // CORRECCIÓN: Usar #rw en lugar de #claim
        if (!targetCharacter.user) {
            return await conn.reply(m.chat, `《✧》*${targetCharacter.name}* está libre. ¡Usa *#rw* para intentar conseguirla con suerte!`, m)
        }
        
        const ownerId = targetCharacter.user
        if (thiefId === ownerId) {
            return await conn.reply(m.chat, `¡No puedes robarte a tu propia waifu! 🤪`, m)
        }
        
        const thiefCoin = await getUserCoin(thiefId)
        const ownerCoin = await getUserCoin(ownerId)
        
        // 1. Verificar Costo (1,000 monedas)
        if (thiefCoin < STEAL_COST) {
            return await conn.reply(m.chat, `¡Robar cuesta *${STEAL_COST.toLocaleString()}* 💰! No tienes suficiente dinero.`, m)
        }

        // 2. Verificar Token de Protección
        if (targetCharacter.protectionUntil && targetCharacter.protectionUntil > now) {
            const remainingDays = Math.ceil((targetCharacter.protectionUntil - now) / (1000 * 60 * 60 * 24))
            
            stealCooldowns[thiefId] = now + STEAL_COOLDOWN_TIME
            
            return await conn.reply(m.chat, `🛡️ ¡Fallo el robo! **${targetCharacter.name}** está protegida por un **Token de Protección** comprado por su amo (@${ownerId.split('@')[0]}). ¡Vuelve en ${remainingDays} días!`, m, { mentions: [ownerId] })
        }
        
        // 3. Calcular Probabilidad de Robo
        const normalizedThiefCoin = Math.min(thiefCoin, 10000000)
        const normalizedOwnerCoin = Math.min(ownerCoin, 10000000)
        
        let successChance = 50 + (normalizedThiefCoin - normalizedOwnerCoin) / 1000000 * 10 
        successChance = Math.max(10, Math.min(90, successChance)) 
        
        const isSuccessful = Math.random() * 100 < successChance
        
        // 4. Deducción del costo de robo y Aplicar Cooldown
        await updateUserCoin(thiefId, -STEAL_COST)
        stealCooldowns[thiefId] = now + STEAL_COOLDOWN_TIME
        
        // 5. Resultado del Robo
        if (isSuccessful) {
            // ÉXITO
            characters[targetIndex].user = thiefId
            delete characters[targetIndex].protectionUntil 
            
            await saveCharacters(characters)
            
            const successMessage = `💸 ¡ROBO EXITOSO! 💸\n\n**${targetCharacter.name}** ha abandonado a @${ownerId.split('@')[0]} y se ha unido a tu harem: (Probabilidad: ${successChance.toFixed(2)}%)\n\n_Costo del intento: ${STEAL_COST.toLocaleString()} 💰._`
            await conn.reply(m.chat, successMessage, m, { mentions: [ownerId, thiefId] })
            
        } else {
            // FRACASO
            const failureMessage = `( ⸝⸝･̆⤚･̆⸝⸝) ¡ROBO FALLIDO! 😥\n\n**${targetCharacter.name}** te rechazó y dijo que eres un vagabundo comparado con su amo (@${ownerId.split('@')[0]}). ¡Gana más dinero e inténtalo de nuevo! (Probabilidad: ${successChance.toFixed(2)}%)\n\n_Costo del intento: ${STEAL_COST.toLocaleString()} 💰._`
            await conn.reply(m.chat, failureMessage, m, { mentions: [ownerId] })
        }

    } catch (error) {
        await conn.reply(m.chat, `✘ Error al intentar robar: ${error.message}`, m)
    }
}

handler.help = ['robarwaifu <ID/Nombre>']
handler.tags = ['gacha']
handler.command = ['robarwaifu']
handler.group = true

export default handler
