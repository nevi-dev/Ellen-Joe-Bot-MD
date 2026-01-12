import fetch from 'node-fetch'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

const handler = m => m
handler.all = async function (m) {
  if (!m.isGroup || m.isBaileys || !m.text || !this) return !0

  let chat = global.db.data.chats[m.chat]
  if (!chat || !chat.audios || m.text.length > 40) return !0

  try {
    const jsonPath = path.join(process.cwd(), 'src', 'database', 'audios.json')
    if (!existsSync(jsonPath)) return !0 

    const db_audios = JSON.parse(readFileSync(jsonPath, 'utf-8'))
    const text = m.text.trim().toLowerCase()
    let audioEncontrado = null

    for (const item of db_audios) {
      const match = item.keywords.some(key => 
        new RegExp(`\\b${key}\\b`, 'i').test(text)
      )
      if (match) {
        audioEncontrado = item
        break 
      }
    }

    if (audioEncontrado) {
      // 1. Enviamos el estado de "grabando audio" al chat
      await this.sendPresenceUpdate('recording', m.chat)

      // 2. Descargamos el audio usando encodeURI para compatibilidad con caracteres especiales
      const response = await fetch(encodeURI(audioEncontrado.link))
      if (!response.ok) return !0
      const buffer = await response.buffer()

      // 3. Enviamos el audio como nota de voz (ptt: true)
      await this.sendMessage(m.chat, { 
        audio: buffer, 
        mimetype: 'audio/mpeg', 
        fileName: `audio.mp3`,
        ptt: true // Esto hace que parezca grabado en el momento
      }, { quoted: m })
      
      // Detenemos el estado de presencia automáticamente al enviar el mensaje
    }
  } catch (e) {
    // Error silencioso
  }

  return !0
}

export default handler
