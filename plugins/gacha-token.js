import { promises as fs } from 'fs'

const charactersFilePath = './src/database/characters.json'
const usersFilePath = './src/database/database.json' 

const PROTECTION_TOKEN_COST = 5000 
const TOKEN_DURATION = 5 * 60 * 60 * 1000 

async function loadCharacters() {
    const data = await fs.readFile(charactersFilePath, 'utf-8')
    return JSON.parse(data)
}

async function saveCharacters(characters) {
    await fs.writeFile(charactersFilePath, JSON.stringify(characters, null, 2), 'utf-8')
}

let handler = async (m, { conn, args }) => {
    const userId = m.sender
    const now = Date.now()

    if (args.length === 0) return await conn.reply(m.chat, `《✧》Debes proporcionar el ID o el nombre de la waifu.\nEjemplo: *#comprartoken 113*`, m)

    const input = args.join(' ').toLowerCase().trim()

    try {
        const characters = await loadCharacters()
        const targetIndex = characters.findIndex(c => c.id == input || c.name.toLowerCase() === input)
        const targetCharacter = characters[targetIndex]

        if (!targetCharacter) return await conn.reply(m.chat, `《✧》No se encontró a la waifu *${input}*.`, m)

        // 1. Verificar Posesión
        if (targetCharacter.user !== userId) return await conn.reply(m.chat, `《✧》Solo puedes proteger waifus que te pertenezcan.`, m)

        // --- CORRECCIÓN: BLOQUEAR SI YA TIENE TOKEN ---
        if (targetCharacter.protectionUntil && targetCharacter.protectionUntil > now) {
            return await conn.reply(m.chat, `🛡️ **${targetCharacter.name}** ya tiene un escudo activo. No puedes acumular más protección hasta que este expire.`, m)
        }

        // 2. Verificar Dinero (Usando global.db para consistencia)
        let user = global.db.data.users[userId]
        if (!user || (user.coin || 0) < PROTECTION_TOKEN_COST) {
            return await conn.reply(m.chat, `❌ **Saldo insuficiente.** Necesitas **${PROTECTION_TOKEN_COST}** 💰.`, m)
        }

        // 3. Aplicar Protección y Cobrar
        characters[targetIndex].protectionUntil = now + TOKEN_DURATION
        user.coin -= PROTECTION_TOKEN_COST 
        
        await saveCharacters(characters)

        const expirationDate = new Date(characters[targetIndex].protectionUntil).toLocaleString('es-ES')
        await conn.reply(m.chat, `🛡️ **¡PROTECCIÓN ADQUIRIDA!**\n\nHas protegido a **${targetCharacter.name}**.\n📅 **Expira:** ${expirationDate}\n💰 **Costo:** ${PROTECTION_TOKEN_COST}`, m)

    } catch (error) {
        await conn.reply(m.chat, `✘ Error: ${error.message}`, m)
    }
}

handler.help = ['comprartoken <ID/Nombre>']
handler.tags = ['gacha']
handler.command = ['comprartoken', 'buytoken', 'proteccion']
handler.group = true

export default handler
