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
      await this.sendPresenceUpdate('recording', m.chat)

      const response = await fetch(encodeURI(audioEncontrado.link))
      if (!response.ok) return !0
      const buffer = await response.buffer()

      const tempInput = path.join(process.cwd(), `temp_in_${Date.now()}`)
      const tempOutput = path.join(process.cwd(), `temp_out_${Date.now()}.opus`)

      writeFileSync(tempInput, buffer)

      try {
        // Comando optimizado: -y (sobreescribir), -vn (no video), -af (filtro para asegurar volumen)
        await execPromise(`ffmpeg -y -i ${tempInput} -vn -c:a libopus -b:a 128k -vbr on -f ogg ${tempOutput}`)
        
        if (existsSync(tempOutput)) {
          const finalBuffer = readFileSync(tempOutput)
          
          // Verificamos que el archivo no esté vacío
          if (finalBuffer.length > 100) {
            await this.sendMessage(m.chat, { 
              audio: finalBuffer, 
              mimetype: 'audio/ogg; codecs=opus', 
              ptt: true 
            }, { quoted: m })
          }
        }
      } catch (convError) {
        // SI FALLA LA CONVERSIÓN: Lo mandamos como audio normal para que no dé error de reproducción
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
