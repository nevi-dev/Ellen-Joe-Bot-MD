import { promises as fs } from 'fs'

const charactersFilePath = './src/database/characters.json'
const PROTECTION_TOKEN_COST = 5000 
const TOKEN_DURATION = 7 * 24 * 60 * 60 * 1000 

let handler = async (m, { conn }) => {
    const userId = m.sender
    const now = Date.now()

    try {
        let characters = await JSON.parse(await fs.readFile(charactersFilePath, 'utf-8'))
        
        // 1. Filtrar solo waifus del usuario que NO tengan protección activa
        const toProtect = characters.filter(c => c.user === userId && (!c.protectionUntil || c.protectionUntil < now))
        const charCount = toProtect.length

        if (charCount === 0) {
            return await conn.reply(m.chat, `《✧》No tienes waifus desprotegidas en tu colección.`, m)
        }

        const totalCost = PROTECTION_TOKEN_COST * charCount
        let user = global.db.data.users[userId]
        
        if (!user || (user.coin || 0) < totalCost) {
            return await conn.reply(m.chat, `❌ **Saldo insuficiente.**\nPara proteger **${charCount}** waifus necesitas **${totalCost.toLocaleString()}** 💰.`, m)
        }

        // 2. Aplicar protección y cobrar
        characters = characters.map(char => {
            if (char.user === userId && (!char.protectionUntil || char.protectionUntil < now)) {
                return { ...char, protectionUntil: now + TOKEN_DURATION }
            }
            return char
        })

        user.coin -= totalCost
        await fs.writeFile(charactersFilePath, JSON.stringify(characters, null, 2))

        await conn.reply(m.chat, `🛡️ **PROTECCIÓN MASIVA ACTIVADA**\n\nHas protegido **${charCount}** waifus.\n💰 **Total cobrado:** ${totalCost.toLocaleString()} 💰`, m)

    } catch (error) {
        await conn.reply(m.chat, `✘ Error: ${error.message}`, m)
    }
}

handler.help = ['tokenall']
handler.tags = ['gacha']
handler.command = ['tokenall']
handler.group = true

export default handler
