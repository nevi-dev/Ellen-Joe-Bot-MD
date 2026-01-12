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
      const response = await fetch(audioEncontrado.link)
      if (!response.ok) return !0
      const buffer = await response.buffer()

      await this.sendMessage(m.chat, { 
        audio: buffer, 
        mimetype: 'audio/mpeg', 
        fileName: `audio.mp3`,
        ptt: false 
      }, { quoted: m })
    }
  } catch (e) {
    // Error silencioso para no llenar la consola
  }

  return !0
}

export default handler
