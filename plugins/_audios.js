import { readFileSync, existsSync } from 'fs'
import path from 'path'

const handler = m => m
handler.all = async function (m, { conn }) {
  // Filtros: Solo grupos, no bots, solo si hay texto y existe la conexión
  if (!m.isGroup || m.isBaileys || !m.text || !conn) return !0

  let chat = global.db.data.chats[m.chat]
  if (!chat || !chat.audios) return !0

  // Si el mensaje es muy largo (ej. más de 40 letras), ignorar para evitar spam
  if (m.text.length > 40) return !0

  try {
    const jsonPath = path.join(process.cwd(), 'src', 'database', 'audios.json')
    if (!existsSync(jsonPath)) return !0 

    const db_audios = JSON.parse(readFileSync(jsonPath, 'utf-8'))
    let text = m.text.trim()

    // Buscamos el audio usando la lógica de RegExp del código que mostraste
    let audioEncontrado = null
    
    for (const item of db_audios) {
      // Creamos una expresión regular para cada keyword del JSON
      // 'i' hace que no importe si es MAYÚSCULA o minúscula
      const match = item.keywords.some(key => 
        new RegExp(`^${key}$`, 'i').test(text)
      )
      
      if (match) {
        audioEncontrado = item
        break // Detenemos el bucle en la primera coincidencia
      }
    }

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
