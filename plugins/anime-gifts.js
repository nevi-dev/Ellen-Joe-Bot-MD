import fetch from 'node-fetch'

let handler = async (m, { conn, command, usedPrefix }) => {
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

    // ✅ Resolver nombres correctamente
    const getName = async (jid) => {
        try {
            const n = await conn.getName(jid)
            return typeof n === 'string' && n.trim() ? n : jid.split('@')[0]
        } catch {
            return jid.split('@')[0]
        }
    }

    let from = m.pushName || await getName(m.sender)
    let who = await getName(userId)

    const apiKey = "Zyzz-1234"

    const isNsfw = command === 'waifuh'
    const type = isNsfw ? 'nsfw' : 'sfw'

    const interactions = {
        'waifu': { action: 'waifu', str: (f) => `✨ Waifu para \`${f}\`` },
        'waifuh': { action: 'waifu', str: (f) => `🔥 Waifu H para \`${f}\`` },
        'neko': { action: 'neko', str: (f) => `🐾 Neko para \`${f}\`` },
        'shinobu': { action: 'shinobu', str: (f) => `🦋 Shinobu para \`${f}\`` },
        'megumin': { action: 'megumin', str: (f) => `💥 Megumin para \`${f}\`` },
        'bully': { action: 'bully', str: (f, w) => `\`${f}\` le hace bullying a \`${w}\`` },
        'cuddle': { action: 'cuddle', str: (f, w) => `\`${f}\` se acurruca con \`${w}\`` },
        'cry': { action: 'cry', str: (f, w) => `\`${f}\` está llorando por \`${w}\`` },
        'hug': { action: 'hug', str: (f, w) => `\`${f}\` le dio un abrazo a \`${w}\` 🤗` },
        'awoo': { action: 'awoo', str: (f) => `\`${f}\` dice: ¡Awoooo!` },
        'kiss': { action: 'kiss', str: (f, w) => `\`${f}\` besó a \`${w}\` 💋` },
        'lick': { action: 'lick', str: (f, w) => `\`${f}\` lamió a \`${w}\`` },
        'pat': { action: 'pat', str: (f, w) => `\`${f}\` acaricia a \`${w}\` 👋` },
        'smug': { action: 'smug', str: (f) => `\`${f}\` se puso presumido/a` },
        'bonk': { action: 'bonk', str: (f, w) => `\`${f}\` le dio un bonk a \`${w}\` 🔨` },
        'yeet': { action: 'yeet', str: (f, w) => `\`${f}\` mandó a volar a \`${w}\`` },
        'blush': { action: 'blush', str: (f) => `\`${f}\` se sonrojó 😳` },
        'smile': { action: 'smile', str: (f, w) => `\`${f}\` le sonrió a \`${w}\`` },
        'wave': { action: 'wave', str: (f, w) => `\`${f}\` saluda a \`${w}\`` },
        'highfive': { action: 'highfive', str: (f, w) => `\`${f}\` chocó los cinco con \`${w}\`` },
        'handhold': { action: 'handhold', str: (f, w) => `\`${f}\` tomó la mano de \`${w}\`` },
        'nom': { action: 'nom', str: (f) => `\`${f}\` está comiendo...` },
        'bite': { action: 'bite', str: (f, w) => `\`${f}\` mordió a \`${w}\`` },
        'glomp': { action: 'glomp', str: (f, w) => `\`${f}\` se lanzó sobre \`${w}\`` },
        'slap': { action: 'slap', str: (f, w) => `\`${f}\` le dio una bofetada a \`${w}\` 🖐️` },
        'kill': { action: 'kill', str: (f, w) => `\`${f}\` mató a \`${w}\` 💀` },
        'patada': { action: 'kick', str: (f, w) => `\`${f}\` le metió una patada a \`${w}\` 🦵` },
        'happy': { action: 'happy', str: (f) => `\`${f}\` está feliz ✨` },
        'wink': { action: 'wink', str: (f, w) => `\`${f}\` le guiñó el ojo a \`${w}\`` },
        'poke': { action: 'poke', str: (f, w) => `\`${f}\` picó a \`${w}\`` },
        'dance': { action: 'dance', str: (f, w) => `\`${f}\` baila con \`${w}\`` },
        'cringe': { action: 'cringe', str: (f) => `\`${f}\` siente cringe... 😬` }
    }

    const aliases = {
        'abrazar': 'hug', 'beso': 'kiss', 'muak': 'kiss', 'lamer': 'lick', 'palmada': 'bonk', 'palmadita': 'pat',
        'picar': 'poke', 'bailar': 'dance', 'feliz': 'happy', 'matar': 'kill', 'patear': 'patada', 'bofetada': 'slap',
        'comer': 'nom', 'morder': 'bite', 'mano': 'handhold', '5': 'highfive', 'ola': 'wave', 'saludar': 'wave',
        'sonreir': 'smile', 'sonrojarse': 'blush', 'presumir': 'smug', 'acurrucarse': 'cuddle', 'llorar': 'cry',
        'bullying': 'bully'
    }

    const cmd = aliases[command] || command
    const interaction = interactions[cmd]

    if (!interaction) return

    try {
        const response = await fetch(`https://rest.apicausas.xyz/api/v1/anime?action=${interaction.action}&type=${type}&apikey=${apiKey}`)
        const json = await response.json()

        if (!json.status || !json.data) return m.reply('❌ Error en la API')

        const mediaUrl = json.data.url
        const text = interaction.str(from, who)
        const mime = json.data.mimetype

        const resMedia = await fetch(mediaUrl)
        const buffer = await resMedia.buffer()

        if (mime.includes('video') || mime.includes('gif')) {
            await conn.sendMessage(m.chat, {
                video: buffer,
                caption: text,
                gifPlayback: true,
                mimetype: 'video/mp4',
                mentions: [userId]
            }, { quoted: m })
        } else {
            await conn.sendMessage(m.chat, {
                image: buffer,
                caption: text,
                mentions: [userId]
            }, { quoted: m })
        }

    } catch (e) {
        console.error(e)
        m.reply('⚠︎ Error al procesar el comando.')
    }
}

handler.help = ['waifu', 'waifuh', 'neko', 'shinobu', 'megumin', 'bully', 'cuddle', 'cry', 'hug', 'awoo', 'kiss', 'lick', 'pat', 'smug', 'bonk', 'yeet', 'blush', 'smile', 'wave', 'highfive', 'handhold', 'nom', 'bite', 'glomp', 'slap', 'kill', 'patada', 'happy', 'wink', 'poke', 'dance', 'cringe']
handler.tags = ['anime']
handler.command = ['waifu', 'waifuh', 'neko', 'shinobu', 'megumin', 'bully', 'cuddle', 'cry', 'hug', 'awoo', 'kiss', 'lick', 'pat', 'smug', 'bonk', 'yeet', 'blush', 'smile', 'wave', 'highfive', 'handhold', 'nom', 'bite', 'glomp', 'slap', 'kill', 'patada', 'happy', 'wink', 'poke', 'dance', 'cringe', 'abrazar', 'beso', 'muak', 'lamer', 'palmada', 'palmadita', 'picar', 'bailar', 'feliz', 'matar', 'patear', 'bofetada', 'comer', 'morder', 'mano', '5', 'ola', 'saludar', 'sonreir', 'sonrojarse', 'presumir', 'acurrucarse', 'llorar', 'bullying']
handler.group = true

export default handler