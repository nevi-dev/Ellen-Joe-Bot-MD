import fetch from 'node-fetch'

const handler = m => m
handler.all = async function (m, { conn }) {
  // 1. LOG DE RECEPCIÓN: Verás esto en la consola de Evihost cada vez que alguien escriba
  if (m.isGroup && m.text) {
    console.log(`[DEBUG] Recibido en: ${m.chat} | Texto: "${m.text}"`)
  }

  // 2. FILTROS BÁSICOS: Solo grupos, no bots, debe haber texto y conexión 'conn'
  if (!m.isGroup || m.isBaileys || !m.text || !conn) return !0

  // 3. VERIFICAR SWITCH: Verifica si el administrador activó el modo audios
  let chat = global.db.data.chats[m.chat]
  if (!chat || !chat.audios) return !0

  // 4. VALIDACIÓN DE LONGITUD: Máximo 40 caracteres para evitar spam
  if (m.text.length > 40) return !0

  const text = m.text.trim().toLowerCase()
  let audioEncontrado = null

  // --- BASE DE DATOS DE AUDIOS ---
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

  // --- LÓGICA DE BÚSQUEDA ---
  for (const item of db_audios) {
    // Busca la palabra clave completa (\b) dentro del texto
    const match = item.keywords.some(key => 
      new RegExp(`\\b${key}\\b`, 'i').test(text)
    )
    
    if (match) {
      audioEncontrado = item
      break 
    }
  }

  // --- EJECUCIÓN ---
  if (audioEncontrado) {
    console.log(`[DEBUG] Coincidencia encontrada: ${text}. Enviando audio...`)
    try {
      const response = await fetch(audioEncontrado.link)
      if (!response.ok) throw new Error(`Status: ${response.status}`)
      const buffer = await response.buffer()

      await conn.sendMessage(m.chat, { 
        audio: buffer, 
        mimetype: 'audio/mpeg', 
        fileName: `audio.mp3`,
        ptt: false 
      }, { quoted: m })

      console.log(`[DEBUG] Audio enviado exitosamente.`)
      return !0
    } catch (e) {
      console.error(`[DEBUG] Error al descargar/enviar:`, e)
    }
  }

  return !0
}

export default handler
