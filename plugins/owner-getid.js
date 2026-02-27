let handler = async (m, { conn }) => {
    // Verificamos si el mensaje viene de un grupo
    if (!m.isGroup) return m.reply('《✧》Este comando solo puede ser usado en grupos.')

    // El ID del grupo se encuentra en m.chat
    let groupId = m.chat
    
    let txt = `╔◡╍┅•.⊹︵ࣾ᷼ ׁ𖥓┅╲۪ ⦙᷼͝🆔᷼͝⦙ ׅ╱ׅ╍𖥓\n`
    txt += `┋ 𝙄𝘿 𝘿𝙀𝙇 𝙂𝙍𝙐𝙋𝙊: \n`
    txt += `┋ *${groupId}*\n`
    txt += `╚◠┅┅˙•⊹.⁀𖥓 ׅ╍╲۪ ⦙᷼͝🎠᷼͝⦙ ׅ╱ׅ╍𖥓\n\n`
    txt += `> _ps tiburon._`

    await conn.reply(m.chat, txt, m)
}

handler.help = ['getid', 'idgp']
handler.tags = ['owner']
handler.command = ['getid', 'idgp', 'id'] // Puedes usar #id o #getid
handler.group = true
handler.rowner = true

export default handler
