let handler = async (m, { conn, command, usedPrefix }) => {
let img = 'icons'
let staff = `ᥫ᭡ *EQUIPO DE AYUDANTES* ❀
✰ *Dueño* ${author}
✦ *Bot: ${namebot}
⚘ *Versión:* ${vs}
❖ *Libreria:* ${libreria} ${baileys}
> ✧ GitHub » https://github.com/nevi-dev
`
await conn.sendFile(m.chat, img, 'Ellen.jpg', staff.trim(), fkontak)
}
  
handler.help = ['staff']
handler.command = ['colaboradores', 'staff']
handler.register = true
handler.tags = ['main']

export default handler
