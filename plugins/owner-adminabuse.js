import { promises as fs } from 'fs'

const charactersFilePath = './src/database/characters.json'

let handler = async (m, { conn, isROwner, text }) => {
    if (!isROwner) return 

    // EVITAR DUPLICADOS
    if (global.adminAbuse && !text) return m.reply('⚠️ Ya hay un **Admin Abuse** en curso.')

    const grupos = ['120363401983111842@g.us', '120363420169896189@g.us']

    // --- INVOCACIÓN MANUAL ---
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

    // --- FASE 1: CUENTA REGRESIVA ---
    global.adminAbuse = true 
    let minutosRestantes = 5

    const fletAnuncio = async (min) => {
        for (let id of grupos) {
            try {
                const { participants } = await conn.groupMetadata(id)
                await conn.sendMessage(id, { 
                    text: `⚠️ **𝘼𝘿𝙈𝙄𝙉 𝘼𝘽𝙐𝙎𝙀 𝘼𝘿𝙑𝙀𝙍𝙏𝙀𝙉𝘾𝙄𝘼** ⚠️\n\nEl evento iniciará en **${min} ${min === 1 ? 'minuto' : 'minutos'}**.\n\n🚫 **#rw** bloqueados.\n🔥 Inicio: **3 personajes**.\n⚡️ Luego: uno cada **20 segundos**.`,
                    mentions: participants.map(u => u.id) 
                })
            } catch (e) { console.log("Error en anuncio") }
        }
    }

    // Mandar el primer anuncio de 5 min
    await fletAnuncio(minutosRestantes)

    // Intervalo que resta 1 minuto cada vez
    let countdownInterval = setInterval(async () => {
        minutosRestantes--
        
        if (minutosRestantes > 0) {
            await fletAnuncio(minutosRestantes)
        } else {
            // CUANDO LLEGA A 0: LIMPIAR Y ARRANCAR FASE 2
            clearInterval(countdownInterval)
            iniciarEstallido(conn, grupos)
        }
    }, 60 * 1000) // Se ejecuta cada 60 segundos
}

// --- FASE 2: EL ESTALLIDO Y SPAM ---
async function iniciarEstallido(conn, grupos) {
    if (!global.adminAbuse) return

    try {
        const data = await fs.readFile(charactersFilePath, 'utf-8')
        let characters = JSON.parse(data)
        let libres = characters.filter(c => !c.user)
        
        // LANZAMIENTO TRIPLE
        for (let i = 0; i < 3; i++) {
            if (libres.length === 0) break
            let index = Math.floor(Math.random() * libres.length)
            let randomChar = libres[index]
            libres.splice(index, 1)
            await enviarWaifu(conn, grupos, randomChar, "🔥 𝑨𝑩𝑼𝑺𝑬 𝑩𝑼𝑹𝑺𝑻")
            await new Promise(res => setTimeout(res, 3000))
        }

        // INTERVALO DE 20 SEGUNDOS
        let spamInterval = setInterval(async () => {
            if (!global.adminAbuse) return clearInterval(spamInterval)
            try {
                const d = await fs.readFile(charactersFilePath, 'utf-8')
                let c = JSON.parse(d).filter(char => !char.user)
                if (c.length === 0) return
                let rc = c[Math.floor(Math.random() * c.length)]
                await enviarWaifu(conn, grupos, rc, "𝑨𝑩𝑼𝑺𝑬 𝑺𝑷𝑨𝑴")
            } catch (e) { console.error(e) }
        }, 20 * 1000)

        // FINALIZACIÓN A LOS 10 MINUTOS
        setTimeout(() => {
            global.adminAbuse = false 
            clearInterval(spamInterval)
            for (let id of grupos) {
                conn.reply(id, '🛑 **𝙀𝙇 𝘼𝘿𝙈𝙄𝙉 𝘼𝘽𝙐𝙎𝙀 𝙃𝘼 𝙏𝙀𝙍𝙈𝙄𝙉𝘼𝘿𝙊** 🛑', null)
            }
        }, 10 * 60 * 1000)

    } catch (e) { console.error("Error estallido:", e) }
}

// --- FUNCIÓN DE ENVÍO CON PROTECCIÓN ANTI-FORBIDDEN ---
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
        try {
            if (resType === 'video') await conn.sendMessage(id, { video: { url: resURL }, gifPlayback: true, caption: message })
            else await conn.sendMessage(id, { image: { url: resURL }, caption: message })
            await new Promise(res => setTimeout(res, 2000)) // Pausa de seguridad
        } catch (e) { console.log(`Error enviando a ${id}`) }
    }
}

handler.command = ['adminabuse']
handler.rowner = true
export default handler
