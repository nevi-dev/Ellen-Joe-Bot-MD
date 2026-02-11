import { promises as fs } from 'fs'

const charactersFilePath = './src/database/characters.json'

async function loadCharacters() {
    try {
        const data = await fs.readFile(charactersFilePath, 'utf-8')
        return JSON.parse(data)
    } catch (error) {
        throw new Error('❀ No se pudo cargar el archivo characters.json.')
    }
}

let handler = async (m, { conn, args }) => {
    if (args.length === 0) {
        await conn.reply(m.chat, `《✧》Por favor, proporciona el nombre de un personaje.`, m)
        return
    }

    const characterName = args.join(' ').toLowerCase().trim()

    try {
        const characters = await loadCharacters()
        const character = characters.find(c => c.name.toLowerCase() === characterName)

        if (!character) {
            await conn.reply(m.chat, `《✧》No se ha encontrado el personaje *${characterName}*.`, m)
            return
        }

        if (!character.img || character.img.length === 0) {
            await conn.reply(m.chat, `《✧》El personaje *${character.name}* no tiene imágenes registradas.`, m)
            return
        }

        const randomImage = character.img[Math.floor(Math.random() * character.img.length)]

        const caption = `❀ Nombre » *${character.name}*
⚥ Género » *${character.gender}*
❖ Fuente » *${character.source}*`

        // Usamos sendMessage con la propiedad 'image' para forzar el envío como foto grande con texto
        await conn.sendMessage(m.chat, { 
            image: { url: randomImage }, 
            caption: caption,
            mimetype: 'image/jpeg' 
        }, { quoted: m })

    } catch (error) {
        await conn.reply(m.chat, `✘ Error: ${error.message}`, m)
    }
}

handler.help = ['wimage <nombre del personaje>']
handler.tags = ['anime']
handler.command = ['charimage', 'wimage', 'waifuimage']
handler.group = true

export default handler
