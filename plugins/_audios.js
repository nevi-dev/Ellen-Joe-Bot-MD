import fetch from 'node-fetch'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

const handler = m => m
handler.all = async function (m, { conn }) {
  // Filtros de seguridad: Solo grupos, no bots, con texto y conexión activa
  if (!m.isGroup || m.isBaileys || !m.text || !conn) return !0

  let chat = global.db.data.chats[m.chat]
  // Solo se ejecuta si el comando '#audios on' fue activado por un admin
  if (!chat || !chat.audios) return !0

  // Si el mensaje es muy largo (más de 40 letras), se ignora para evitar spam
  if (m.text.length > 40) return !0

  try {
    // Localización del archivo JSON en tu estructura ../src/database/
    const jsonPath = path.join(process.cwd(), 'src', 'database', 'audios.json')
    if (!existsSync(jsonPath)) return !0 

    const db_audios = JSON.parse(readFileSync(jsonPath, 'utf-8'))
    let text = m.text.trim()

    let audioEncontrado = null

    // Lógica de búsqueda: Compara el mensaje con cada keyword usando RegExp
    for (const item of db_audios) {
      const match = item.keywords.some(key => 
        new RegExp(`^${key}$`, 'i').test(text)
      )
      
      if (match) {
        audioEncontrado = item
        break // Se detiene al encontrar el primer audio que coincida
      }
    }

    if (audioEncontrado) {
      // Descarga del archivo mediante node-fetch para procesarlo como buffer
      const response = await fetch(audioEncontrado.link)
      if (!response.ok) throw new Error(`Error al descargar audio: ${response.statusText}`)
      const buffer = await response.buffer()

      // Envío del audio como archivo .mp3 (ptt: false)
      await conn.sendMessage(m.chat, { 
        audio: buffer, 
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
