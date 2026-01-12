import fetch from 'node-fetch'

const handler = m => m
handler.all = async function (m, { conn }) {
  // 1. Log de recepción: Ver en consola todo lo que llega al handler
  if (m.isGroup && m.text) {
    console.log(`[DEBUG] Mensaje recibido en: ${m.chat} | Texto: "${m.text}"`)
  }

  // Filtros básicos
  if (!m.isGroup || m.isBaileys || !m.text || !conn) return !0

  // 2. Debug del Switch: Ver si la función está ON u OFF en el grupo
  let chat = global.db.data.chats[m.chat]
  if (!chat) {
    console.log(`[DEBUG] El chat ${m.chat} no existe en la base de datos.`)
    return !0
  }

  if (!chat.audios) {
    // console.log(`[DEBUG] Los audios están DESACTIVADOS en este grupo.`) // Descomenta si quieres ver esto siempre
    return !0
  }

  console.log(`[DEBUG] Los audios están ACTIVADOS en este grupo. Buscando coincidencia...`)

  // 3. Validación de longitud
  if (m.text.length > 40) {
    console.log(`[DEBUG] Mensaje ignorado por ser demasiado largo (${m.text.length} caracteres).`)
    return !0
  }

  const text = m.text.trim()
  let audioEncontrado = null

  const db_audios = [
    { "keywords": ["chamba", "trabajar", "mi primera chamba"], "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768176498317.mpeg" },
    { "keywords": ["goku", "esta vaina es seria", "seria"], "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768176618931.mpeg" },
    { "keywords": ["mickey", "mister beast", "raton"], "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768176694355.mpeg" },
    { "keywords": ["vegeta", "moto", "dinero", "donar"], "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768176732033.mpeg" },
    { "keywords": ["me dejaron", "triste", "llorar", "soledad"], "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768176769905.mp4" },
    { "keywords": ["momazo", "momo", "buen momo"], "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768176853729.mp4" },
    { "keywords": ["esencia", "tablos", "7 palabras"], "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768176925552.mpeg" },
    { "keywords": ["algo cambio", "dentro de mi", "cambio"], "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768177038343.mpeg" },
    { "keywords": ["vete alv", "vete", "alv"], "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768177051547.mpeg" },
    { "keywords": ["turbo paja", "paja", "pajin"], "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768177056960.mpeg" },
    { "keywords": ["terreneitor", "coche", "4x4"], "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768177148053.mpeg" },
    { "keywords": ["fracasado", "ban", "baneado", "perdedor"], "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768177165280.mpeg" },
    { "keywords": ["xd", "jajaja", "risa"], "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768177353716.ogg" },
    { "keywords": ["onichan", "oni chan", "yamete"], "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768177361177.ogg" },
    { "keywords": ["bienvenido", "welcome", "bienvenida"], "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768177368621.mpeg" }
  ]

  // Búsqueda
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
    console.log(`[DEBUG] ¡COINCIDENCIA ENCONTRADA! Intentando enviar: ${audioEncontrado.link}`)
    try {
      const response = await fetch(audioEncontrado.link)
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`)
      const buffer = await response.buffer()

      await conn.sendMessage(m.chat, { 
        audio: buffer, 
        mimetype: 'audio/mpeg', 
        fileName: `audio.mp3`,
        ptt: false 
      }, { quoted: m })
      
      console.log(`[DEBUG] Audio enviado con éxito.`)
      return !0
    } catch (e) {
      console.log(`[DEBUG] Error al procesar el audio: ${e.message}`)
    }
  } else {
    console.log(`[DEBUG] No se encontró ninguna palabra clave coincidente.`)
  }

  return !0
}

export default handler
