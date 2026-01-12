import fetch from 'node-fetch'
import { readFileSync, existsSync } from 'fs'
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

      // --- PROCESO DE CONVERSIÓN ---
      // Creamos nombres de archivos temporales
      const tempInput = path.join(process.cwd(), `temp_in_${Date.now()}`)
      const tempOutput = path.join(process.cwd(), `temp_out_${Date.now()}.opus`)

      // Guardamos el buffer descargado
      fs.writeFileSync(tempInput, buffer)

      try {
        // Comando FFmpeg para convertir a nota de voz compatible (Ogg/Opus)
        await execPromise(`ffmpeg -i ${tempInput} -acodec libopus -filter:a "volume=1.0" -vbr on -compression_level 10 ${tempOutput}`)
        
        const finalBuffer = fs.readFileSync(tempOutput)

        await this.sendMessage(m.chat, { 
          audio: finalBuffer, 
          mimetype: 'audio/ogg; codecs=opus', 
          ptt: true 
        }, { quoted: m })

      } catch (convError) {
        console.error("FFmpeg no está instalado o falló:", convError)
        // Si falla la conversión, intentamos enviarlo normal como respaldo
        await this.sendMessage(m.chat, { audio: buffer, mimetype: 'audio/mp4', ptt: true }, { quoted: m })
      } finally {
        // Borrar archivos temporales para no llenar el disco
        if (existsSync(tempInput)) fs.unlinkSync(tempInput)
        if (existsSync(tempOutput)) fs.unlinkSync(tempOutput)
      }
    }
  } catch (e) {
    console.error("Error general:", e)
  }
  return !0
}

export default handler
