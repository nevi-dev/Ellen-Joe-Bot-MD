import fetch from 'node-fetch'

const handler = async (m, { conn, args, usedPrefix, command }) => {
    let mentionedJid = m.mentionedJid || []
    let userId = mentionedJid.length > 0 ? mentionedJid[0] : (m.quoted ? m.quoted.sender : m.sender)

    // ✅ Resolver LID a JID normal
    if (userId.endsWith('@lid') || isNaN(userId.split('@')[0])) {
        try {
            const groupMeta = await conn.groupMetadata(m.chat)
            const found = groupMeta.participants.find(p => p.id === userId || p.lid === userId)
            if (found?.jid) userId = found.jid
        } catch {}
    }

    // ✅ Nombres
    const getName = async (jid) => {
        try {
            const n = await conn.getName(jid)
            return typeof n === 'string' && n.trim() ? n : jid.split('@')[0]
        } catch { return jid.split('@')[0] }
    }

    let from = m.pushName || await getName(m.sender)
    let who = await getName(userId)

    // Configuración de la API
    const apiKey = "Zyzz-1234"
    const baseURL = "https://rest.apicausas.xyz/api/v1/anime"

    // Mapeo de interacciones y sus frases
    const interactions = {
        // SFW
        'awoo': { str: (f) => `\`${f}\` dice: ¡Awoooo! 🐺` },
        'bite': { str: (f, w) => `\`${f}\` mordió a \`${w}\` 🦷` },
        'blush': { str: (f) => `\`${f}\` se sonrojó 😳` },
        'bonk': { str: (f, w) => `\`${f}\` le dio un bonk a \`${w}\` 🔨` },
        'bully': { str: (f, w) => `\`${f}\` le hace bullying a \`${w}\` 👊` },
        'cringe': { str: (f) => `\`${f}\` siente cringe... 😬` },
        'cry': { str: (f, w) => `\`${f}\` está llorando por \`${w}\` 😭` },
        'cuddle': { str: (f, w) => `\`${f}\` se acurruca con \`${w}\` 🫂` },
        'dance': { str: (f, w) => `\`${f}\` baila con \`${w}\` 💃` },
        'glomp': { str: (f, w) => `\`${f}\` se lanzó sobre \`${w}\` ✨` },
        'handhold': { str: (f, w) => `\`${f}\` tomó la mano de \`${w}\` 🤝` },
        'happy': { str: (f) => `\`${f}\` está feliz ✨` },
        'highfive': { str: (f, w) => `\`${f}\` chocó los cinco con \`${w}\` 🖐️` },
        'hug': { str: (f, w) => `\`${f}\` le dio un abrazo a \`${w}\` 🤗` },
        'kill': { str: (f, w) => `\`${f}\` mató a \`${w}\` 💀` },
        'kiss': { str: (f, w) => `\`${f}\` besó a \`${w}\` 💋` },
        'lick': { str: (f, w) => `\`${f}\` lamió a \`${w}\` 👅` },
        'nom': { str: (f) => `\`${f}\` está comiendo... 😋` },
        'pat': { str: (f, w) => `\`${f}\` acaricia a \`${w}\` 👋` },
        'poke': { str: (f, w) => `\`${f}\` picó a \`${w}\` 👉` },
        'slap': { str: (f, w) => `\`${f}\` le dio una bofetada a \`${w}\` 🖐️` },
        'smile': { str: (f, w) => `\`${f}\` le sonrió a \`${w}\` 😊` },
        'smug': { str: (f) => `\`${f}\` se puso presumido/a 😏` },
        'wave': { str: (f, w) => `\`${f}\` saluda a \`${w}\` 👋` },
        'wink': { str: (f, w) => `\`${f}\` le guiñó el ojo a \`${w}\` 😉` },
        'yeet': { str: (f, w) => `\`${f}\` mandó a volar a \`${w}\` ☄️` },
        // NSFW
        'anal': { str: (f, w) => `\`${f}\` le da por el anal a \`${w}\` 🔞`, nsfw: true },
        'blowjob': { str: (f, w) => `\`${f}\` se la mama a \`${w}\` 🔞`, nsfw: true },
        'bondage': { str: (f, w) => `\`${f}\` amarró a \`${w}\` 🔞`, nsfw: true },
        'boobjob': { str: (f, w) => `\`${f}\` le hace un ruso a \`${w}\` 🔞`, nsfw: true },
        'bukkake': { str: (f, w) => `\`${f}\` llenó de leche a \`${w}\` 🔞`, nsfw: true },
        'creampie': { str: (f, w) => `\`${f}\` se vino dentro de \`${w}\` 🔞`, nsfw: true },
        'cum': { str: (f) => `\`${f}\` se está viniendo... 🔞`, nsfw: true },
        'cummoth': { str: (f, w) => `\`${f}\` le llenó la boca a \`${w}\` 🔞`, nsfw: true },
        'cumshot': { str: (f, w) => `\`${f}\` se vino sobre \`${w}\` 🔞`, nsfw: true },
        'deepthroat': { str: (f, w) => `\`${f}\` le hace garganta profunda a \`${w}\` 🔞`, nsfw: true },
        'facesitting': { str: (f, w) => `\`${f}\` se sentó en la cara de \`${w}\` 🔞`, nsfw: true },
        'fap': { str: (f) => `\`${f}\` se está pajeando 🔞`, nsfw: true },
        'fingering': { str: (f, w) => `\`${f}\` está dedeando a \`${w}\` 🔞`, nsfw: true },
        'footjob': { str: (f, w) => `\`${f}\` usa sus pies con \`${w}\` 🔞`, nsfw: true },
        'fuck': { str: (f, w) => `\`${f}\` se está follando a \`${w}\` 🔞`, nsfw: true },
        'futanari': { str: (f) => `Futanari para \`${f}\` 🔞`, nsfw: true },
        'grabboobs': { str: (f, w) => `\`${f}\` le agarra las tetas a \`${w}\` 🔞`, nsfw: true },
        'grope': { str: (f, w) => `\`${f}\` está manoseando a \`${w}\` 🔞`, nsfw: true },
        'handjob': { str: (f, w) => `\`${f}\` le hace una paja a \`${w}\` 🔞`, nsfw: true },
        'lickass': { str: (f, w) => `\`${f}\` le lame el culo a \`${w}\` 🔞`, nsfw: true },
        'lickdick': { str: (f, w) => `\`${f}\` le lame el pene a \`${w}\` 🔞`, nsfw: true },
        'lickpussy': { str: (f, w) => `\`${f}\` le lame la vagina a \`${w}\` 🔞`, nsfw: true },
        'orgy': { str: (f) => `¡Orgía con \`${f}\`! 🔞`, nsfw: true },
        'pegging': { str: (f, w) => `\`${f}\` le hace pegging a \`${w}\` 🔞`, nsfw: true },
        'sixnine': { str: (f, w) => `\`${f}\` hace un 69 con \`${w}\` 🔞`, nsfw: true },
        'spank': { str: (f, w) => `\`${f}\` le da nalgadas a \`${w}\` 🔞`, nsfw: true },
        'squirting': { str: (f, w) => `\`${f}\` hizo squirt sobre \`${w}\` 🔞`, nsfw: true },
        'suckboobs': { str: (f, w) => `\`${f}\` le chupa los pechos a \`${w}\` 🔞`, nsfw: true },
        'thighjob': { str: (f, w) => `\`${f}\` usa sus muslos con \`${w}\` 🔞`, nsfw: true },
        'undress': { str: (f) => `\`${f}\` se está desvistiendo... 🔞`, nsfw: true },
        'yaoi': { str: (f) => `Yaoi para \`${f}\` 🔞`, nsfw: true },
        'yuri': { str: (f) => `Yuri para \`${f}\` 🔞`, nsfw: true }
    }

    const aliases = {
        'abrazar': 'hug', 'beso': 'kiss', 'muak': 'kiss', 'lamer': 'lick', 'palmada': 'bonk', 'palmadita': 'pat',
        'picar': 'poke', 'bailar': 'dance', 'feliz': 'happy', 'matar': 'kill', 'bofetada': 'slap',
        'comer': 'nom', 'morder': 'bite', 'mano': 'handhold', '5': 'highfive', 'ola': 'wave', 'saludar': 'wave',
        'sonreir': 'smile', 'sonrojarse': 'blush', 'presumir': 'smug', 'acurrucarse': 'cuddle', 'llorar': 'cry',
        'bullying': 'bully'
    }

    const action = aliases[command] || command
    const interaction = interactions[action]

    if (!interaction) return

    // 1. Verificación de NSFW para grupos
    if (interaction.nsfw) {
        const chat = global.db.data.chats[m.chat];
        if (m.isGroup && !chat?.nsfw) {
            return m.reply(`*Ugh, qué molesto.* 🔞\nEste lugar es demasiado "limpio". Si quieres que trabaje, activa el modo NSFW: *${usedPrefix}nsfw on*`);
        }
    }

    try {
        const type = interaction.nsfw ? 'nsfw' : 'sfw'
        const response = await fetch(`${baseURL}?action=${action}&type=${type}&apikey=${apiKey}`)
        const json = await response.json()

        if (!json.status || !json.data) return m.reply('❌ Error en la API o acción no disponible.')

        const mediaUrl = json.data.url
        const text = interaction.str(from, who)
        
        // Al usar tu API, el archivo llega directamente. 
        // No es necesario buffer manual si usamos la URL en el mensaje, 
        // pero para asegurar la compatibilidad con el pipe de tu API:
        await conn.sendMessage(m.chat, {
            video: { url: mediaUrl }, // O image: { url: mediaUrl } según mimetype
            caption: text,
            gifPlayback: true,
            mentions: [userId]
        }, { quoted: m })

    } catch (e) {
        console.error(e)
        m.reply('⚠︎ Error al procesar el comando.')
    }
}

handler.help = ['sfw', 'nsfw'].map(v => 'anime ' + v)
handler.tags = ['anime']
handler.command = [
    // Lista completa basada en available_actions
    "anal", "awoo", "bite", "blowjob", "blush", "bondage", "bonk", "boobjob", "bukkake", "bully", "creampie", "cringe", "cry", "cuddle", "cum", "cummoth", "cumshot", "dance", "deepthroat", "facesitting", "fap", "fingering", "footjob", "fuck", "futanari", "glomp", "grabboobs", "grope", "handhold", "handjob", "happy", "highfive", "hug", "kill", "kiss", "lick", "lickass", "lickdick", "lickpussy", "nom", "orgy", "pat", "pegging", "poke", "sixnine", "slap", "smile", "smug", "spank", "squirting", "suckboobs", "thighjob", "undress", "wave", "wink", "yaoi", "yeet", "yuri",
    // Aliases
    'abrazar', 'beso', 'muak', 'lamer', 'palmada', 'palmadita', 'picar', 'bailar', 'feliz', 'matar', 'bofetada', 'comer', 'morder', 'mano', '5', 'ola', 'saludar', 'sonreir', 'sonrojarse', 'presumir', 'acurrucarse', 'llorar', 'bullying'
]
handler.group = true

export default handler
