let handler = async (m, { conn, command, usedPrefix }) => {
let staff = `ᥫ᭡ *EQUIPO DE AYUDANTES* ❀
✰ *Dueño* ${author}
✦ *Bot: ${namebot}
⚘ *Versión:* ${vs}
❖ *Libreria:* ${libreria} ${baileys}
> ✧ GitHub » https://github.com/nevi-dev
`
await conn.sendFile(m.chat, icons, 'Ellen.jpg', staff.trim(), fkontak)
}
  
handler.help = ['prueba']
handler.command = ['prueba']
handler.register = true
handler.tags = ['main']

export default handler


