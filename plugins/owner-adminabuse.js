import { promises as fs } from 'fs'

const charactersFilePath = './src/database/characters.json'

let handler = async (m, { conn, isROwner, text }) => {
    if (!isROwner) return 

    const grupos = ['123456789@g.us', '987654321@g.us'] // <--- Tus IDs aquí

    // --- INVOCACIÓN MANUAL POR ID ---
    if (text) {
        try {
            const data = await fs.readFile(charactersFilePath, 'utf-8')
            let characters = JSON.parse(data)
            let char = characters.find(c => c.id.toString() === text.trim())
            if (!char) return m.reply(`✘ No encontré la ID: ${text}`)
            await enviarWaifu(conn, grupos, char, "𝑰𝑵𝑽𝑶𝑪𝑨𝑪𝑰𝑶́𝑵 𝑶𝑾𝑵𝑬𝑹")
            return 
        } catch (e) { return m.reply('✘ Error al buscar.') }
    }

    // --- FASE 1: ANUNCIO Y ESPERA (5 MINUTOS) ---
    global.adminAbuse = true 

    for (let id of grupos) {
        const { participants } = await conn.groupMetadata(id)
        await conn.sendMessage(id, { 
            text: `⚠️ **𝘼𝘿𝙈𝙄𝙉 𝘼𝘽𝙐𝙎𝙀 𝘼𝘿𝙑𝙀𝙍𝙏𝙀𝙉𝘾𝙄𝘼** ⚠️\n\nEl evento iniciará en **5 minutos**.\n\n🚫 **#rw** y **#robarwaifu** bloqueados.\n🔥 Al iniciar, lanzaremos **3 personajes** de golpe.\n⚡️ Luego, caerá uno nuevo cada **20 segundos**.\n✅ Reclamos y robos por **#c** sin límites.`,
            mentions: participants.map(u => u.id) 
        })
    }

    // --- FASE 2: EL ESTALLIDO (Después de 5 min) ---
    setTimeout(async () => {
        if (!global.adminAbuse) return

        // LANZAMIENTO TRIPLE DE GOLPE
        try {
            const data = await fs.readFile(charactersFilePath, 'utf-8')
            let characters = JSON.parse(data)
            let libres = characters.filter(c => !c.user)
            
            for (let i = 0; i < 3; i++) {
                if (libres.length === 0) break
                let index = Math.floor(Math.random() * libres.length)
                let randomChar = libres[index]
                libres.splice(index, 1) // No repetir en el triple envío
                await enviarWaifu(conn, grupos, randomChar, "🔥 𝑨𝑩𝑼𝑺𝑬 𝑩𝑼𝑹𝑺𝑻")
            }
        } catch (e) { console.error("Error burst:", e) }

        // INICIO DE SPAM CADA 20 SEGUNDOS
        let spamInterval = setInterval(async () => {
            if (!global.adminAbuse) return clearInterval(spamInterval)
            
            try {
                const data = await fs.readFile(charactersFilePath, 'utf-8')
                let characters = JSON.parse(data)
                let libres = characters.filter(c => !c.user)
                if (libres.length === 0) return
                
                let randomChar = libres[Math.floor(Math.random() * libres.length)]
                await enviarWaifu(conn, grupos, randomChar, "𝑨𝑩𝑼𝑺𝑬 𝑺𝑷𝑨𝑴")
            } catch (e) { console.error(e) }
        }, 20 * 1000) // <--- Cambio a 20 segundos

        // FASE 3: FINALIZACIÓN (10 minutos después del estallido)
        setTimeout(() => {
            global.adminAbuse = false 
            clearInterval(spamInterval)
            for (let id of grupos) {
                conn.reply(id, '🛑 **𝙀𝙇 𝘼𝘿𝙈𝙄𝙉 𝘼𝘽𝙐𝙎𝙀 𝙃𝘼 𝙏𝙀𝙍𝙈𝙄𝙉𝘼𝘿𝙊** 🛑\nLos sistemas vuelven a la normalidad. ¡Buen botín!', null)
            }
        }, 10 * 60 * 1000)

    }, 5 * 60 * 1000)
}

// Función de envío (Mantiene tu diseño original)
async function enviarWaifu(conn, grupos, char, titulo) {
    const hasVideos = char.vid?.length > 0
    const hasImages = char.img?.length > 0
    let resURL, resType

    if (hasVideos && hasImages) {
        if (Math.random() < 0.7) { resURL = char.vid[Math.floor(Math.random() * char.vid.length)]; resType = 'video' }
        else { resURL = char.img[Math.floor(Math.random() * char.img.length)]; resType = 'image' }
    } else if (hasVideos) { resURL = char.vid[Math.floor(Math.random() * char.vid.length)]; resType = 'video' }
    else { resURL = char.img[Math.floor(Math.random() * char.img.length)]; resType = 'image' }

    const message = `╔◡╍┅•.⊹︵ࣾ᷼ ׁ𖥓┅╲۪ ⦙᷼͝🧸᷼͝⦙ ׅ╱ׅ╍𖥓 ︵ࣾ᷼︵ׄׄ᷼⊹┅╍◡╗\n┋  ⣿̶ֻ㪝ׅ⃕݊⃧🐚⃚̶̸͝ᤢ֠◌ִ̲ ${titulo} 🐸ꨪ̸⃙ׅᮬֺ๋֢᳟  ┋\n╚◠┅┅˙•⊹.⁀𖥓 ׅ╍╲۪ ⦙᷼͝🎠᷼͝⦙ ׅ╱ׅ╍𖥓 ◠˙⁀۪ׄ⊹˙╍┅◠╝\n\n> 𝙉𝙊𝙈𝘽𝙍𝙀: *${char.name}*\n> 𝙂𝙀𝙉𝙀𝙍𝙊: *${char.gender}*\n> 𝙑𝘼𝙇𝙊𝙍: *${char.value}*\n> 𝙀𝙎𝙏𝘼𝘿𝙊: ✨ ¡𝗟𝗶𝗯𝗿𝗲!\n> 𝙄𝘿: *${char.id}*`

    for (let id of grupos) {
        if (resType === 'video') await conn.sendMessage(id, { video: { url: resURL }, gifPlayback: true, caption: message })
        else await conn.sendMessage(id, { image: { url: resURL }, caption: message })
    }
}

handler.command = ['adminabuse']
handler.rowner = true
export default handler
