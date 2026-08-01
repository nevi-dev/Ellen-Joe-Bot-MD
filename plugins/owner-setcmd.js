import db from '../database.js'
let handler = async (m, { text, usedPrefix, command }) => {
  db.data.sticker = db.data.sticker || {}

  if (!m.quoted) return conn.reply(m.chat, `${emoji} Responda a un sticker para agregar un comando.`, m)
  if (!m.quoted.fileSha256) return conn.reply(m.chat, `${emoji} Responda a un sticker para agregar un comando.`, m)
  if (!text) return conn.reply(m.chat, `${emoji2} Ingresa el nombre del comando.`, m)

  try {
    let sticker = db.data.sticker
    let hash = m.quoted.fileSha256.toString('base64')

    if (sticker[hash] && sticker[hash].locked) {
      return conn.reply(m.chat, `${emoji2} No tienes permiso para cambiar este comando de Sticker.`, m)
    }

    sticker[hash] = {
      text,
      // Aseguramos que mentionedJid siempre sea un array válido.
      // Si m.mentionedJid es undefined o null, se usará un array vacío.
      // Si ya es un array, simplemente lo asignamos.
      mentionedJid: Array.isArray(m.mentionedJid) ? m.mentionedJid : [],
      creator: m.sender,
      at: +new Date,
      locked: false,
    }

    await conn.reply(m.chat, `${emoji} Comando guardado con éxito.`, m)
    await m.react('✅')
  } catch (e) {
    // Puedes agregar un console.error(e) aquí si quieres ver los errores en la consola
    // sin afectar la respuesta del bot al usuario.
    await m.react('✖️')
  }
}

handler.help = ['cmd'].map(v => 'set' + v + ' *<texto>*')
handler.tags = ['owner']
handler.command = ['setcmd', 'addcmd', 'cmdadd', 'cmdset']
handler.owner = true

export default handler
