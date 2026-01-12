import { readFileSync, existsSync } from 'fs'
import path from 'path'

const handler = m => m
handler.all = async function (m, { conn }) {
  // Añadimos !conn para evitar el error de la imagen
  if (!m.isGroup || m.isBaileys || !m.text || !conn) return !0

  let chat = global.db.data.chats[m.chat]
  if (!chat || !chat.audios) return !0

  if (m.text.length > 30) return !0

  try {
    // Asegúrate de que esta carpeta exista: src/database/
    const jsonPath = path.join(process.cwd(), 'src', 'database', 'audios.json')
    if (!existsSync(jsonPath)) return !0 

    const db_audios = JSON.parse(readFileSync(jsonPath, 'utf-8'))
    let text = m.text.toLowerCase().trim()

    const audioEncontrado = db_audios.find(item => 
      item.keywords.some(key => text.includes(key.toLowerCase()))
    )

    if (audioEncontrado) {
      await conn.sendMessage(m.chat, { 
        audio: { url: audioEncontrado.link }, 
        mimetype: 'audio/mpeg', 
        fileName: `audio.mp3`,
        ptt: false 
      }, { quoted: m })

      return !0
    }

  } catch (e) {
    console.error("Error en audios_handler:", e)
  }

  return !0
}

export default handler
