import fetch from 'node-fetch'

const handler = m => m
handler.all = async function (m, { conn }) {
  // 1. Filtros: Solo grupos, no mensajes del bot, debe haber texto y conexión activa
  if (!m.isGroup || m.isBaileys || !m.text || !conn) return !0

  // 2. Verificar si el switch 'audios' está activado en la base de datos del chat
  let chat = global.db.data.chats[m.chat]
  if (!chat || !chat.audios) return !0

  // 3. Ignorar mensajes muy largos para evitar spam accidental
  if (m.text.length > 40) return !0

  const text = m.text.trim()
  let audioEncontrado = null

  // --- BASE DE DATOS INTEGRADA ---
  const db_audios = [
    {
      "keywords": ["chamba", "trabajar", "mi primera chamba"],
      "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768176498317.mpeg"
    },
    {
      "keywords": ["goku", "esta vaina es seria", "seria"],
      "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768176618931.mpeg"
    },
    {
      "keywords": ["mickey", "mister beast", "raton"],
      "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768176694355.mpeg"
    },
    {
      "keywords": ["vegeta", "moto", "dinero", "donar"],
      "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768176732033.mpeg"
    },
    {
      "keywords": ["me dejaron", "triste", "llorar", "soledad"],
      "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768176769905.mp4"
    },
    {
      "keywords": ["momazo", "momo", "buen momo"],
      "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768176853729.mp4"
    },
    {
      "keywords": ["esencia", "tablos", "7 palabras"],
      "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768176925552.mpeg"
    },
    {
      "keywords": ["algo cambio", "dentro de mi", "cambio"],
      "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768177038343.mpeg"
    },
    {
      "keywords": ["vete alv", "vete", "alv"],
      "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768177051547.mpeg"
    },
    {
      "keywords": ["turbo paja", "paja", "pajin"],
      "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768177056960.mpeg"
    },
    {
      "keywords": ["terreneitor", "coche", "4x4"],
      "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768177148053.mpeg"
    },
    {
      "keywords": ["fracasado", "ban", "baneado", "perdedor"],
      "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768177165280.mpeg"
    },
    {
      "keywords": ["xd", "jajaja", "risa"],
      "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768177353716.ogg"
    },
    {
      "keywords": ["onichan", "oni chan", "yamete"],
      "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768177361177.ogg"
    },
    {
      "keywords": ["bienvenido", "welcome", "bienvenida"],
      "link": "https://raw.githubusercontent.com/nevi-dev/nevi-dev/main/src/file_1768177368621.mpeg"
    }
  ]

  // --- LÓGICA DE BÚSQUEDA ---
  for (const item of db_audios) {
    // Busca si alguna palabra clave coincide exactamente con el texto (ignora mayúsculas)
    const match = item.keywords.some(key => 
      new RegExp(`^${key}$`, 'i').test(text)
    )
    
    if (match) {
      audioEncontrado = item
      break 
    }
  }

  // --- ENVÍO DEL AUDIO ---
  if (audioEncontrado) {
    try {
      // Descargamos el archivo como buffer para asegurar el envío
      const response = await fetch(audioEncontrado.link)
      if (!response.ok) throw new Error(`Fallo al descargar: ${response.statusText}`)
      const buffer = await response.buffer()

      await conn.sendMessage(m.chat, { 
        audio: buffer, 
        mimetype: 'audio/mpeg', 
        fileName: `audio.mp3`,
        ptt: false 
      }, { quoted: m })
      
      return !0
    } catch (e) {
      console.error("Error enviando el audio:", e)
    }
  }

  return !0
}

export default handler
