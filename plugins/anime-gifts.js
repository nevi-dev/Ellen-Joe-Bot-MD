import fetch from 'node-fetch'

let handler = async (m, { conn, command, usedPrefix }) => {
    let mentionedJid = await m.mentionedJid
    let userId = mentionedJid.length > 0 ? mentionedJid[0] : (m.quoted ? await m.quoted.sender : m.sender)
    
    // Nombres de usuario
    let from = await (async () => global.db.data.users[m.sender]?.name || (async () => { try { const n = await conn.getName(m.sender); return typeof n === 'string' && n.trim() ? n : m.sender.split('@')[0] } catch { return m.sender.split('@')[0] } })())()
    let who = await (async () => global.db.data.users[userId]?.name || (async () => { try { const n = await conn.getName(userId); return typeof n === 'string' && n.trim() ? n : userId.split('@')[0] } catch { return userId.split('@')[0] } })())()

    const apiKey = "causa-ee5ee31dcfc79da4"
    
    // Solo categorías disponibles en tu API SFW
    const interactions = {
        'waifu': { action: 'waifu', str: (f) => `Aquí tienes una waifu para \`${f}\`` },
        'neko': { action: 'neko', str: (f) => `Aquí tienes una neko para \`${f}\`` },
        'shinobu': { action: 'shinobu', str: (f) => `Aquí tienes a Shinobu para \`${f}\`` },
        'megumin': { action: 'megumin', str: (f) => `Aquí tienes a Megumin para \`${f}\`` },
        'bully': { action: 'bully', str: (f, w) => f === w ? `\`${f}\` se hace bullying solo/a` : `\`${f}\` está haciendo bullying a \`${w}\`` },
        'cuddle': { action: 'cuddle', str: (f, w) => f === w ? `\`${f}\` se acurrucó consigo mismo/a` : `\`${f}\` se acurrucó con \`${w}\`` },
        'cry': { action: 'cry', str: (f, w) => f === w ? `\`${f}\` está llorando` : `\`${f}\` está llorando por \`${w}\`` },
        'hug': { action: 'hug', str: (f, w) => f === w ? `\`${f}\` se abrazó a sí mismo/a` : `\`${f}\` abrazó a \`${w}\`` },
        'awoo': { action: 'awoo', str: (f) => `\`${f}\` está aullando! Awooo!!` },
        'kiss': { action: 'kiss', str: (f, w) => f === w ? `\`${f}\` se besó a sí mismo/a` : `\`${f}\` besó a \`${w}\`` },
        'lick': { action: 'lick', str: (f, w) => f === w ? `\`${f}\` se lamió a sí mismo/a` : `\`${f}\` lamió a \`${w}\`` },
        'pat': { action: 'pat', str: (f, w) => f === w ? `\`${f}\` se da palmaditas` : `\`${f}\` acaricia suavemente a \`${w}\`` },
        'smug': { action: 'smug', str: (f) => `\`${f}\` está presumiendo con arrogancia` },
        'bonk': { action: 'bonk', str: (f, w) => f === w ? `\`${f}\` se dio un golpe` : `\`${f}\` le dio un bonk a \`${w}\`` },
        'yeet': { action: 'yeet', str: (f, w) => f === w ? `\`${f}\` se lanzó solo/a` : `\`${f}\` lanzó a \`${w}\` muy lejos` },
        'blush': { action: 'blush', str: (f, w) => f === w ? `\`${f}\` se sonrojó` : `\`${f}\` se sonrojó por \`${w}\`` },
        'smile': { action: 'smile', str: (f, w) => f === w ? `\`${f}\` está sonriendo` : `\`${f}\` le sonrió a \`${w}\`` },
        'wave': { action: 'wave', str: (f, w) => f === w ? `\`${f}\` se saluda a sí mismo/a` : `\`${f}\` está saludando a \`${w}\`` },
        'highfive': { action: 'highfive', str: (f, w) => f === w ? `\`${f}\` se chocó los cinco` : `\`${f}\` chocó los cinco con \`${w}\`` },
        'handhold': { action: 'handhold', str: (f, w) => f === w ? `\`${f}\` se dio la mano a sí mismo/a` : `\`${f}\` le agarró la mano a \`${w}\`` },
        'nom': { action: 'nom', str: (f) => `\`${f}\` está comiendo... Nom nom nom!` },
        'bite': { action: 'bite', str: (f, w) => f === w ? `\`${f}\` se mordió a sí mismo/a` : `\`${f}\` mordió a \`${w}\`` },
        'glomp': { action: 'glomp', str: (f, w) => f === w ? `\`${f}\` se lanzó al suelo` : `\`${f}\` se lanzó sobre \`${w}\` para abrazarlo/a` },
        'slap': { action: 'slap', str: (f, w) => f === w ? `\`${f}\` se dio una bofetada` : `\`${f}\` le dio una bofetada a \`${w}\`` },
        'kill': { action: 'kill', str: (f, w) => f === w ? `\`${f}\` se mató a sí mismo/a` : `\`${f}\` mató a \`${w}\`` },
        'kick': { action: 'kick', str: (f, w) => f === w ? `\`${f}\` se pateó solo/a` : `\`${f}\` le dio una patada a \`${w}\`` },
        'happy': { action: 'happy', str: (f) => `\`${f}\` está muy feliz!` },
        'wink': { action: 'wink', str: (f, w) => f === w ? `\`${f}\` se guiñó al espejo` : `\`${f}\` le guiñó el ojo a \`${w}\`` },
        'poke': { action: 'poke', str: (f, w) => f === w ? `\`${f}\` se picó solo/a` : `\`${f}\` picó a \`${w}\`` },
        'dance': { action: 'dance', str: (f, w) => f === w ? `\`${f}\` está bailando` : `\`${f}\` está bailando con \`${w}\`` },
        'cringe': { action: 'cringe', str: (f) => `\`${f}\` siente mucha vergüenza (cringe)` }
    }

    const aliases = {
        'abrazar': 'hug', 'beso': 'kiss', 'muak': 'kiss', 'lamer': 'lick', 'palmada': 'bonk', 'palmadita': 'pat',
        'picar': 'poke', 'bailar': 'dance', 'feliz': 'happy', 'matar': 'kill', 'patear': 'kick', 'bofetada': 'slap',
        'comer': 'nom', 'morder': 'bite', 'mano': 'handhold', '5': 'highfive', 'ola': 'wave', 'saludar': 'wave',
        'sonreir': 'smile', 'sonrojarse': 'blush', 'presumir': 'smug', 'acurrucarse': 'cuddle', 'llorar': 'cry',
        'bullying': 'bully'
    }

    const cmd = aliases[command] || command
    const interaction = interactions[cmd]

    if (!interaction) return m.reply(`⚠︎ Comando no reconocido. Disponibles:\n${Object.keys(interactions).join(', ')}`)

    if (m.isGroup) {
        try {
            // URL de tu API ajustada
            const url = `https://rest.apicausas.xyz/api/v1/anime?action=${interaction.action}&type=sfw&apikey=${apiKey}`
            const res = await fetch(url)
            const json = await res.json()

            if (!json.status || !json.data) return m.reply('ꕥ No se encontraron resultados en la API.')

            const text = interaction.str(from, who)
            const videoUrl = json.data.url

            // Enviamos como video con gifPlayback para que se vea como reacción
            conn.sendMessage(m.chat, { 
                video: { url: videoUrl }, 
                gifPlayback: true, 
                caption: text, 
                mentions: [userId] 
            }, { quoted: m })

        } catch (e) {
            console.log(e)
            return m.reply(`⚠︎ Error al conectar con la API.\n${e.message}`)
        }
    }
}

handler.help = ['waifu', 'neko', 'shinobu', 'megumin', 'bully', 'cuddle', 'cry', 'hug', 'awoo', 'kiss', 'lick', 'pat', 'smug', 'bonk', 'yeet', 'blush', 'smile', 'wave', 'highfive', 'handhold', 'nom', 'bite', 'glomp', 'slap', 'kill', 'kick', 'happy', 'wink', 'poke', 'dance', 'cringe']
handler.tags = ['anime']
handler.command = ['waifu', 'neko', 'shinobu', 'megumin', 'bully', 'cuddle', 'cry', 'hug', 'awoo', 'kiss', 'lick', 'pat', 'smug', 'bonk', 'yeet', 'blush', 'smile', 'wave', 'highfive', 'handhold', 'nom', 'bite', 'glomp', 'slap', 'kill', 'kick', 'happy', 'wink', 'poke', 'dance', 'cringe', 'abrazar', 'beso', 'muak', 'lamer', 'palmada', 'palmadita', 'picar', 'bailar', 'feliz', 'matar', 'patear', 'bofetada', 'comer', 'morder', 'mano', '5', 'ola', 'saludar', 'sonreir', 'sonrojarse', 'presumir', 'acurrucarse', 'llorar', 'bullying']
handler.group = true

export default handler
