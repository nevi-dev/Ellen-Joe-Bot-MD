import fetch from 'node-fetch'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

const handler = m => m
handler.all = async function (m, { conn }) {
  // 1. Filtros básicos
  if (!m.isGroup || m.isBaileys || !m.text || !conn) return !0

  // 2. Verificar el Switch (Asegúrate de haberlo activado con #audios on)
  let chat = global.db?.data?.chats?.[m.chat]
  if (!chat || !chat.audios) return !0

  // 3. Validación de longitud
  if (m.text.length > 40) return !0

  try {
    // 4. RUTA DEL ARCHIVO (Probamos la ruta absoluta para evitar errores)
    const jsonPath = path.join(process.cwd(), 'src', 'database', 'audios.json')
    
    if (!existsSync(jsonPath)) {
      console.log(`[!] ERROR: No se encuentra el archivo en: ${jsonPath}`)
      return !0
    }

    const db_audios = JSON.parse(readFileSync(jsonPath, 'utf-8'))
    let text = m.text.trim()

    let audioEncontrado = null

    // 5. Búsqueda con RegExp (Igual al código que me pasaste de ejemplo)
    for (const item of db_audios) {
      const match = item.keywords.some(key => 
        new RegExp(`^${key}$`, 'i').test(text)
      )
      
      if (match) {
        audioEncontrado = item
        break 
      }
    }

    if (audioEncontrado) {
      console.log(`[+] Enviando audio para: ${text}`)
      
      const response = await fetch(audioEncontrado.link)
      if (!response.ok) throw new Error(`Error en descarga: ${response.statusText}`)
      const buffer = await response.buffer()

      await conn.sendMessage(m.chat, { 
        audio: buffer, 
        mimetype: 'audio/mpeg', 
        fileName: `audio.mp3`,
        ptt: false 
      }, { quoted: m })

      return !0
    }

  } catch (e) {
    console.error("[-] Error en audios_handler:", e)
  }

  return !0
}

export default handler
