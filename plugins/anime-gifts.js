import fetch from 'node-fetch'

const handler = async (m, { conn, args, usedPrefix, command }) => {
    let mentionedJid = m.mentionedJid || []
    let isSelf = mentionedJid.length === 0 && !m.quoted
    let userId = isSelf ? m.sender : (mentionedJid.length > 0 ? mentionedJid[0] : m.quoted.sender)

    // ✅ Resolver LID a JID normal (Compatibilidad con WhatsApp actual)
    if (userId.endsWith('@lid') || isNaN(userId.split('@')[0])) {
        try {
            const groupMeta = await conn.groupMetadata(m.chat)
            const found = groupMeta.participants.find(p => p.id === userId || p.lid === userId)
            if (found?.jid) userId = found.jid
        } catch {}
    }

    const getName = async (jid) => {
        try {
            const n = await conn.getName(jid)
            return typeof n === 'string' && n.trim() ? n : jid.split('@')[0]
        } catch { return jid.split('@')[0] }
    }

    let from = m.pushName || await getName(m.sender)
    let who = await getName(userId)

    const apiKey = "Zyzz-1234"
    const apiCausas = "https://rest.apicausas.xyz/api/v1/anime"
    const apiWaifuPics = "https://api.waifu.pics"

    const interactions = {
        // --- SFW ---
        'waifu': { api: 'waifu.pics', type: 'sfw', str: (f) => `✨ Waifu para \`${f}\`` },
        'awoo': { str: (f) => `\`${f}\` dice: ¡Awoooo! 🐺` },
        'bite': { str: (f, w, s) => s ? `\`${f}\` se mordió solo/a... 🦷` : `\`${f}\` mordió a \`${w}\` 🦷` },
        'blush': { str: (f) => `\`${f}\` se sonrojó 😳` },
        'bonk': { str: (f, w, s) => s ? `\`${f}\` se dio un auto-bonk 🔨` : `\`${f}\` le dio un bonk a \`${w}\` 🔨` },
        'bully': { str: (f, w, s) => s ? `\`${f}\` se hace bullying...` : `\`${f}\` le hace bullying a \`${w}\` 👊` },
        'cringe': { str: (f) => `\`${f}\` siente cringe... 😬` },
        'cry': { str: (f) => `\`${f}\` está llorando 😭` },
        'cuddle': { str: (f, w, s) => s ? `\`${f}\` se acurruca solo/a 🫂` : `\`${f}\` se acurruca con \`${w}\` 🫂` },
        'dance': { str: (f, w, s) => s ? `\`${f}\` baila solo/a ✨` : `\`${f}\` baila con \`${w}\` 💃` },
        'glomp': { str: (f, w, s) => s ? `\`${f}\` se lanzó al suelo` : `\`${f}\` se lanzó sobre \`${w}\` ✨` },
        'handhold': { str: (f, w, s) => s ? `\`${f}\` se toma su mano` : `\`${f}\` tomó la mano de \`${w}\` 🤝` },
        'happy': { str: (f) => `\`${f}\` está feliz ✨` },
        'highfive': { str: (f, w, s) => s ? `\`${f}\` chocó los cinco con el aire` : `\`${f}\` chocó los cinco con \`${w}\` 🖐️` },
        'hug': { str: (f, w, s) => s ? `\`${f}\` se dio un auto-abrazo 🤗` : `\`${f}\` le dio un abrazo a \`${w}\` 🤗` },
        'kill': { str: (f, w, s) => s ? `\`${f}\` se suicidó 💀` : `\`${f}\` mató a \`${w}\` 💀` },
        'kiss': { str: (f, w, s) => s ? `\`${f}\` se besó al espejo 💋` : `\`${f}\` besó a \`${w}\` 💋` },
        'lick': { str: (f, w, s) => s ? `\`${f}\` se está lamiendo` : `\`${f}\` lamió a \`${w}\` 👅` },
        'nom': { str: (f) => `\`${f}\` está comiendo... 😋` },
        'pat': { str: (f, w, s) => s ? `\`${f}\` se da palmaditas` : `\`${f}\` acaricia a \`${w}\` 👋` },
        'poke': { str: (f, w, s) => s ? `\`${f}\` se picó a sí mismo/a` : `\`${f}\` picó a \`${w}\` 👉` },
        'slap': { str: (f, w, s) => s ? `\`${f}\` se dio una cachetada 🖐️` : `\`${f}\` le dio una bofetada a \`${w}\` 🖐️` },
        'smile': { str: (f) => `\`${f}\` está sonriendo 😊` },
        'smug': { str: (f) => `\`${f}\` se puso presumido/a 😏` },
        'wave': { str: (f) => `\`${f}\` está saludando 👋` },
        'wink': { str: (f) => `\`${f}\` guiñó el ojo 😉` },
        'yeet': { str: (f, w, s) => s ? `\`${f}\` se mandó a volar` : `\`${f}\` mandó a volar a \`${w}\` ☄️` },

        // --- NSFW ---
        'waifuh': { api: 'waifu.pics', type: 'nsfw', action: 'waifu', str: (f) => `🔥 Waifu H para \`${f}\``, nsfw: true },
        'anal': { str: (f, w, s) => s ? `\`${f}\` se está dando auto-anal... ¿cómo? 🔞` : `\`${f}\` le da por el anal a \`${w}\` 🔞`, nsfw: true },
        'blowjob': { str: (f, w, s) => s ? `\`${f}\` está... ¿intentando automamársela? 🔞` : `\`${f}\` se la mama a \`${w}\` 🔞`, nsfw: true },
        'bondage': { str: (f, w, s) => s ? `\`${f}\` se amarró a sí mismo/a 🔞` : `\`${f}\` amarró a \`${w}\` 🔞`, nsfw: true },
        'boobjob': { str: (f, w, s) => s ? `\`${f}\` se hace un ruso a sí mismo/a 🔞` : `\`${f}\` le hace un ruso a \`${w}\` 🔞`, nsfw: true },
        'bukkake': { str: (f, w, s) => s ? `\`${f}\` se bañó en su propia leche 🔞` : `\`${f}\` llenó de leche a \`${w}\` 🔞`, nsfw: true },
        'creampie': { str: (f, w, s) => s ? `\`${f}\` se vino dentro de... ¿él mismo? 🔞` : `\`${f}\` se vino dentro de \`${w}\` 🔞`, nsfw: true },
        'cum': { str: (f, w, s) => s ? `\`${f}\` se está viniendo solo/a... 🔞` : `\`${f}\` se vino sobre \`${w}\` 🔞`, nsfw: true },
        'cummoth': { str: (f, w, s) => s ? `\`${f}\` tiene la boca llena de su leche 🔞` : `\`${f}\` le llenó la boca a \`${w}\` 🔞`, nsfw: true },
        'cumshot': { str: (f, w, s) => s ? `\`${f}\` se vino al aire 🔞` : `\`${f}\` se vino sobre \`${w}\` 🔞`, nsfw: true },
        'deepthroat': { str: (f, w, s) => s ? `\`${f}\` está practicando garganta profunda 🔞` : `\`${f}\` le hace garganta profunda a \`${w}\` 🔞`, nsfw: true },
        'facesitting': { str: (f, w, s) => s ? `\`${f}\` se sentó en su propia mano 🔞` : `\`${f}\` se sentó en la cara de \`${w}\` 🔞`, nsfw: true },
        'fap': { str: (f) => `\`${f}\` se está pajeando intensamente 🔞`, nsfw: true },
        'fingering': { str: (f, w, s) => s ? `\`${f}\` se está explorando solo/a 🔞` : `\`${f}\` está dedeando a \`${w}\` 🔞`, nsfw: true },
        'footjob': { str: (f, w, s) => s ? `\`${f}\` se toca con sus propios pies 🔞` : `\`${f}\` usa sus pies con \`${w}\` 🔞`, nsfw: true },
        'fuck': { str: (f, w, s) => s ? `\`${f}\` se está dando placer solo/a 🔞` : `\`${f}\` se está follando a \`${w}\` 🔞`, nsfw: true },
        'futanari': { str: (f) => `Futanari para \`${f}\` 🔞`, nsfw: true },
        'grabboobs': { str: (f, w, s) => s ? `\`${f}\` se agarra sus propias tetas 🔞` : `\`${f}\` le agarra las tetas a \`${w}\` 🔞`, nsfw: true },
        'grope': { str: (f, w, s) => s ? `\`${f}\` se está manoseando solo/a 🔞` : `\`${f}\` está manoseando a \`${w}\` 🔞`, nsfw: true },
        'handjob': { str: (f, w, s) => s ? `\`${f}\` se está haciendo una paja 🔞` : `\`${f}\` le hace una paja a \`${w}\` 🔞`, nsfw: true },
        'lickass': { str: (f, w, s) => s ? `\`${f}\` intenta lamerse el culo 🔞` : `\`${f}\` le lame el culo a \`${w}\` 🔞`, nsfw: true },
        'lickdick': { str: (f, w, s) => s ? `\`${f}\` se lame su propio miembro 🔞` : `\`${f}\` le lame el pene a \`${w}\` 🔞`, nsfw: true },
        'lickpussy': { str: (f, w, s) => s ? `\`${f}\` se lame su propia vagina 🔞` : `\`${f}\` le lame la vagina a \`${w}\` 🔞`, nsfw: true },
        'orgy': { str: (f) => `¡Orgía salvaje con \`${f}\`! 🔞`, nsfw: true },
        'pegging': { str: (f, w, s) => s ? `\`${f}\` se está auto-pegging? 🔞` : `\`${f}\` le hace pegging a \`${w}\` 🔞`, nsfw: true },
        'sixnine': { str: (f, w, s) => s ? `\`${f}\` está muy flexible hoy 🔞` : `\`${f}\` hace un 69 con \`${w}\` 🔞`, nsfw: true },
        'spank': { str: (f, w, s) => s ? `\`${f}\` se dio una nalgada 🔞` : `\`${f}\` le da nalgadas a \`${w}\` 🔞`, nsfw: true },
        'squirting': { str: (f, w, s) => s ? `\`${f}\` hizo squirt solo/a 🔞` : `\`${f}\` hizo squirt sobre \`${w}\` 🔞`, nsfw: true },
        'suckboobs': { str: (f, w, s) => s ? `\`${f}\` se chupa sus propios pechos 🔞` : `\`${f}\` le chupa los pechos a \`${w}\` 🔞`, nsfw: true },
        'thighjob': { str: (f, w, s) => s ? `\`${f}\` usa sus muslos para él mismo 🔞` : `\`${f}\` usa sus muslos con \`${w}\` 🔞`, nsfw: true },
        'undress': { str: (f) => `\`${f}\` se está desvistiendo... 🔞`, nsfw: true },
        'yaoi': { str: (f) => `Yaoi para \`${f}\` 🔞`, nsfw: true },
        'yuri': { str: (f) => `Yuri para \`${f}\` 🔞`, nsfw: true }
    }

    const aliases = {
        'abrazar': 'hug', 'beso': 'kiss', 'muak': 'kiss', 'lamer': 'lick', 'palmada': 'bonk', 'palmadita': 'pat',
        'picar': 'poke', 'bailar': 'dance', 'feliz': 'happy', 'matar': 'kill', 'bofetada': 'slap',
        'comer': 'nom', 'morder': 'bite', 'mano': 'handhold', '5': 'highfive', 'ola': 'wave', 'saludar': 'wave',
        'sonreir': 'smile', 'sonrojarse': 'blush', 'presumir': 'smug', 'acurrucarse': 'cuddle', 'llorar': 'cry',
        'bullying': 'bully', 'patear': 'yeet'
    }

    const action = aliases[command] || command
    const interaction = interactions[action]

    if (!interaction) return

    if (interaction.nsfw) {
        const chat = global.db.data.chats[m.chat];
        if (m.isGroup && !chat?.nsfw) {
            return m.reply(`*Ugh, qué molesto.* 🔞\nEste lugar es demasiado "limpio". Activa el modo NSFW: *${usedPrefix}nsfw on*`);
        }
    }

    try {
        let mediaUrl;
        
        if (interaction.api === 'waifu.pics') {
            const res = await fetch(`${apiWaifuPics}/${interaction.type}/${interaction.action || action}`)
            const json = await res.json()
            mediaUrl = json.url
        } else {
            const response = await fetch(`${apiCausas}?action=${action}&apikey=${apiKey}`)
            const contentType = response.headers.get('content-type')

            // Si la API devuelve JSON (con la URL)
            if (contentType && contentType.includes('application/json')) {
                const json = await response.json()
                mediaUrl = json.data?.url
            } else {
                // Si la API devuelve el VIDEO DIRECTO (Streaming Buffer)
                mediaUrl = await response.buffer()
            }
        }

        if (!mediaUrl) return m.reply('❌ No se pudo obtener el contenido.')

        const caption = interaction.str(from, who, isSelf)

        await conn.sendMessage(m.chat, {
            [typeof mediaUrl === 'string' && (mediaUrl.endsWith('.mp4') || mediaUrl.includes('yuki-wabot')) ? 'video' : 'image']: 
            typeof mediaUrl === 'string' ? { url: mediaUrl } : mediaUrl,
            caption: caption,
            gifPlayback: true,
            mentions: [userId]
        }, { quoted: m })

    } catch (e) {
        console.error(e)
        m.reply('⚠︎ Error al procesar el comando.')
    }
}

handler.help = ['waifu', 'waifuh', 'anime']
handler.tags = ['anime']
handler.command = [
    "waifu", "waifuh", "anal", "awoo", "bite", "blowjob", "blush", "bondage", "bonk", "boobjob", "bukkake", "bully", "creampie", "cringe", "cry", "cuddle", "cum", "cummoth", "cumshot", "dance", "deepthroat", "facesitting", "fap", "fingering", "footjob", "fuck", "futanari", "glomp", "grabboobs", "grope", "handhold", "handjob", "happy", "highfive", "hug", "kill", "kiss", "lick", "lickass", "lickdick", "lickpussy", "nom", "orgy", "pat", "pegging", "poke", "sixnine", "slap", "smile", "smug", "spank", "squirting", "suckboobs", "thighjob", "undress", "wave", "wink", "yaoi", "yeet", "yuri",
    'abrazar', 'beso', 'muak', 'lamer', 'palmada', 'palmadita', 'picar', 'bailar', 'feliz', 'matar', 'bofetada', 'comer', 'morder', 'mano', '5', 'ola', 'saludar', 'sonreir', 'sonrojarse', 'presumir', 'acurrucarse', 'llorar', 'bullying', 'patear'
]
handler.group = true

export default handler
