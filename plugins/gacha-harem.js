import { promises as fs } from 'fs'

const charactersFilePath = './src/database/characters.json'
const haremFilePath = './src/database/harem.json' 

async function loadCharacters() {
    try {
        const data = await fs.readFile(charactersFilePath, 'utf-8')
        return JSON.parse(data)
    } catch (error) {
        throw new Error('❀ No se pudo cargar el archivo characters.json.')
    }
}

async function loadHarem() {
    try {
        const data = await fs.readFile(haremFilePath, 'utf-8')
        return JSON.parse(data)
    } catch (error) {
        return []
    }
}

let handler = async (m, { conn, args }) => {
    try {
        const characters = await loadCharacters()
        const harem = await loadHarem()
        let userId

        if (m.quoted && m.quoted.sender) {
            // 1. Prioridad: Mensaje citado
            userId = m.quoted.sender
        } else if (m.mentionedJid && m.mentionedJid.length > 0) {
            // 2. NUEVA PRIORIDAD: Usuario mencionado (más fiable con IDs opacos/LID)
            userId = m.mentionedJid[0]
        } else if (args[0] && args[0].startsWith('@')) {
            // 3. Fallback: Reconstrucción manual a partir del texto (Menos fiable)
            // Se asume que args[0] es el número si no se pudo obtener de m.mentionedJid.
            const mentionNumber = args[0].replace(/[@\s]/g, '').split('@')[0];
            userId = mentionNumber + '@s.whatsapp.net'
        } else {
            // 4. Por defecto: El que envía el comando
            userId = m.sender
        }
        
        // --- LIMPIEZA Y LÓGICA DE BÚSQUEDA (sin cambios en la lógica) ---

        const userCharacters = characters.filter(character => character.user === userId)

        if (userCharacters.length === 0) {
            await conn.reply(m.chat, '❀ No tiene personajes reclamados en el harem.', m)
            return
        }

        // Paginación
        const page = parseInt(args.find((arg, index) => index > 0 && !isNaN(parseInt(arg)))) || 1 
        const charactersPerPage = 50
        const totalCharacters = userCharacters.length
        const totalPages = Math.ceil(totalCharacters / charactersPerPage)
        const startIndex = (page - 1) * charactersPerPage
        const endIndex = Math.min(startIndex + charactersPerPage, totalCharacters)

        if (page < 1 || page > totalPages) {
            await conn.reply(m.chat, `❀ Página no válida. Hay un total de *${totalPages}* páginas.`, m)
            return
        }

        // Limpieza y formateo del ID para mostrar
        const rawId = userId.split('@')[0];
        const displayId = rawId.replace(/[+\s]/g, '');

        let message = `✿ Personajes reclamados ✿\n`
        message += `⌦ Usuario: @${displayId}\n`
        message += `♡ Personajes: *(${totalCharacters}):*\n\n`
        
        const now = Date.now()

        for (let i = startIndex; i < endIndex; i++) {
            const character = userCharacters[i]
            
            let protectionStatus = ''
            if (character.protectionUntil && character.protectionUntil > now) {
                const expirationDate = new Date(character.protectionUntil).toLocaleDateString('es-ES', { 
                    day: '2-digit', month: '2-digit', year: 'numeric' 
                })
                protectionStatus = ` 🛡️ (Prot. hasta ${expirationDate})`
            } else if (character.protectionUntil && character.protectionUntil <= now) {
                protectionStatus = ' ⚠️ (Prot. Expirada)'
            }
            
            message += `» *${character.name}* (*${character.value}*)${protectionStatus}\n`
        }

        message += `\n> ⌦ _Página *${page}* de *${totalPages}*_`

        await conn.reply(m.chat, message, m, { mentions: [userId] })
    } catch (error) {
        await conn.reply(m.chat, `✘ Error al cargar el harem: ${error.message}`, m)
    }
}

handler.help = ['harem [@usuario] [pagina]']
handler.tags = ['anime']
handler.command = ['harem', 'claims', 'waifus']
handler.group = true

export default handler
