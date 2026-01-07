import { promises as fs } from 'fs'

const charactersFilePath = './src/database/characters.json'
const haremFilePath = './src/database/harem.json'

async function loadCharacters() {
    try {
        const data = await fs.readFile(charactersFilePath, 'utf-8')
        return JSON.parse(data)
    } catch (error) {
        throw new Error('No se pudo cargar el archivo characters.json.')
    }
}

async function saveCharacters(characters) {
    try {
        await fs.writeFile(charactersFilePath, JSON.stringify(characters, null, 2), 'utf-8')
    } catch (error) {
        throw new Error('❀ No se pudo guardar el archivo characters.json.')
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

async function saveHarem(harem) {
    try {
        await fs.writeFile(haremFilePath, JSON.stringify(harem, null, 2))
    } catch (error) {
        throw new Error('❀ No se pudo guardar el archivo harem.json.')
    }
}

let handler = async (m, { conn, args }) => {
    const userId = m.sender
    
    // CAMBIO: Ahora detecta si se está respondiendo a un mensaje
    let who = m.quoted ? m.quoted.sender : (m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : null)

    if (!who) {
        return await conn.reply(m.chat, `*— (Bostezo)*... Responde al mensaje de alguien para regalarle algo. No voy a andar buscando a quién te refieres.`, m)
    }

    if (!args[0]) {
        return await conn.reply(m.chat, `*— Oye...* Dime el nombre de la waifu que quieres regalar. No puedo leer tu mente, qué pereza.`, m)
    }

    const characterName = args.join(' ').toLowerCase().trim()

    try {
        const characters = await loadCharacters()
        const targetIndex = characters.findIndex(c => c.name.toLowerCase() === characterName && c.user === userId)
        const character = characters[targetIndex]

        if (!character) {
            return await conn.reply(m.chat, `*— ¿Eh?* Esa waifu no es tuya o ni siquiera existe. No intentes regalar cosas que no posees, es vergonzoso.`, m)
        }

        if (who === userId) {
            return await conn.reply(m.chat, `*— ¿Auto-regalo?* Qué pérdida de tiempo... Quédate con ella y déjame descansar.`, m)
        }

        // Transferencia de dueño
        characters[targetIndex].user = who
        // Limpiar protección si tenía (nuevo dueño, nuevas reglas)
        delete characters[targetIndex].protectionUntil 
        
        await saveCharacters(characters)

        // Actualizar Harem
        const harem = await loadHarem()
        const userEntryIndex = harem.findIndex(entry => entry.userId === who)

        if (userEntryIndex !== -1) {
            harem[userEntryIndex].characterId = character.id
            harem[userEntryIndex].lastClaimTime = Date.now()
        } else {
            harem.push({
                userId: who,
                characterId: character.id,
                lastClaimTime: Date.now()
            })
        }

        await saveHarem(harem)

        await conn.reply(m.chat, `🦈 **Transferencia Completada**\n\n*— Bien, trato hecho.* He enviado a **${character.name}** con @${who.split('@')[0]}. Espero que la cuides mejor que este tipo... o no, me da igual.\n\n*— Mi trabajo aquí terminó. Me voy a comer algo dulce.*`, m, { mentions: [who] })

    } catch (error) {
        await conn.reply(m.chat, `*— Tsk, algo se rompió:* ${error.message}. Qué molesto es esto.`, m)
    }
}

handler.help = ['regalar <nombre> (responder mensaje)']
handler.tags = ['gacha']
handler.command = ['regalar', 'givewaifu', 'givechar']
handler.group = true

export default handler
