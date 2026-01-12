import { readFileSync, existsSync } from 'fs'
import path from 'path'

const handler = m => m
handler.all = async function (m, { conn }) {
  // 1. Filtros básicos: Solo grupos, no bots, solo si hay texto
  if (!m.isGroup || m.isBaileys || !m.text) return !0

  let chat = global.db.data.chats[m.chat]
  
  // 2. Verificar si el switch 'audios' está activado
  if (!chat || !chat.audios) return !0

  // 3. VALIDACIÓN DE LONGITUD: Si el mensaje tiene más de 30 letras, ignorar
  // Esto evita que mande audios por error en párrafos largos.
  if (m.text.length > 30) return !0

  try {
    const jsonPath = path.join(process.cwd(), './src/database/audios.json')
    if (!existsSync(jsonPath)) return !0 

    const db_audios = JSON.parse(readFileSync(jsonPath, 'utf-8'))
    let text = m.text.toLowerCase().trim()

    // 4. LÓGICA DE UN SOLO AUDIO:
    // .find() se detiene en la PRIMERA coincidencia que encuentre
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
      
      // Retornamos true para finalizar la ejecución y que no busque más
      return !0
    }

  } catch (e) {
    console.error("Error en audios_handler:", e)
  }

  return !0
}

export default handler
