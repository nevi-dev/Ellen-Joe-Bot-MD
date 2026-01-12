import fetch from 'node-fetch'
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'

const execPromise = promisify(exec)

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
      // Indicamos que el bot está grabando
      await this.sendPresenceUpdate('recording', m.chat)

      const response = await fetch(encodeURI(audioEncontrado.link))
      if (!response.ok) return !0
      const buffer = await response.buffer()

      // Archivos temporales
      const tempInput = path.join(process.cwd(), `temp_in_${Date.now()}`)
      const tempOutput = path.join(process.cwd(), `temp_out_${Date.now()}.opus`)

      writeFileSync(tempInput, buffer)

      try {
        /**
         * AJUSTE EN EL COMANDO FFmpeg:
         * -vn: Elimina el video (crucial para los .mp4)
         * -c:a libopus: Codifica específicamente para WhatsApp
         * -f ogg: Fuerza el contenedor Ogg
         */
        await execPromise(`ffmpeg -i ${tempInput} -vn -acodec libopus -filter:a "volume=1.0" -vbr on ${tempOutput}`)
        
        const finalBuffer = readFileSync(tempOutput)

        await this.sendMessage(m.chat, { 
          audio: finalBuffer, 
          mimetype: 'audio/ogg; codecs=opus', 
          ptt: true 
        }, { quoted: m })

      } catch (convError) {
        console.error("FFmpeg falló al procesar el archivo:", convError)
        // Si FFmpeg falla, enviamos el original como mp4 pero con ptt: false para evitar el error de reproducción
        await this.sendMessage(m.chat, { 
            audio: buffer, 
            mimetype: 'audio/mp4', 
            ptt: false 
        }, { quoted: m })
      } finally {
        if (existsSync(tempInput)) unlinkSync(tempInput)
        if (existsSync(tempOutput)) unlinkSync(tempOutput)
      }
    }
  } catch (e) {
    // Error silencioso
  }
  return !0
}

export default handler
