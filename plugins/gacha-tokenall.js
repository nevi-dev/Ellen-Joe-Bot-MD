import { promises as fs } from 'fs'

const charactersFilePath = './src/database/characters.json'
const PROTECTION_TOKEN_COST = 5000 
const TOKEN_DURATION = 7 * 24 * 60 * 60 * 1000 

let handler = async (m, { conn }) => {
    const userId = m.sender
    const now = Date.now()

    try {
        let characters = JSON.parse(await fs.readFile(charactersFilePath, 'utf-8'))
        
        // FILTRAR SOLO WAIFUS SIN PROTECCIÓN ACTIVA
        const toProtect = characters.filter(c => c.user === userId && (!c.protectionUntil || c.protectionUntil < now))
        const charCount = toProtect.length

        if (charCount === 0) {
            return await conn.reply(m.chat, `*— (Masticando caramelos)*... Ya todas tus waifus tienen escudo. No me pidas que trabaje si no hay nada que hacer.`, m)
        }

        const totalCost = PROTECTION_TOKEN_COST * charCount
        let user = global.db.data.users[userId]
        
        if (!user || (user.coin || 0) < totalCost) {
            return await conn.reply(m.chat, `*— Tsk.* Qué problemático... Quieres proteger a **${charCount}** waifus pero no tienes los **${totalCost.toLocaleString()}** 💰 necesarios. Consigue el dinero y luego hablamos.`, m)
        }

        // APLICAR PROTECCIÓN Y COBRAR
        characters = characters.map(char => {
            if (char.user === userId && (!char.protectionUntil || char.protectionUntil < now)) {
                return { ...char, protectionUntil: now + TOKEN_DURATION }
            }
            return char
        })

        user.coin -= totalCost
        await fs.writeFile(charactersFilePath, JSON.stringify(characters, null, 2))

        await conn.reply(m.chat, `🦈 **Servicio Masivo: Victoria Housekeeping**\n\n*— Ugh, qué cansancio...* He terminado de ponerles el escudo a tus **${charCount}** waifus. Espero que esto sea suficiente para que me dejes descansar un rato.\n\n💰 **Tarifa total:** ${totalCost.toLocaleString()} 💰\n📅 **Estado:** Escudos activados por 1 semana.\n\n*— Mi turno terminó. Si necesitas algo más, que sea rápido.*`, m)

    } catch (error) {
        await conn.reply(m.chat, `*— Suspiro...* Hubo un error técnico: ${error.message}. Esto arruina mi hora del té.`, m)
    }
}

handler.help = ['tokenall']
handler.tags = ['gacha']
handler.command = ['tokenall']
handler.group = true

export default handler
