import { tmpdir } from 'os'
import { join } from 'path'
import { readdirSync, statSync, unlinkSync } from 'fs'

let handler = async (m, { conn, __dirname }) => {
  const tmp = [tmpdir(), join(__dirname, '../tmp')]
  const filename = []

  tmp.forEach(dirname => {
    try {
      readdirSync(dirname).forEach(file => filename.push(join(dirname, file)))
    } catch {}
  })

  let borrados = 0
  filename.forEach(file => {
    try {
      unlinkSync(file)
      borrados++
    } catch {}
  })

  conn.reply(m.chat, `🗑️ Se eliminaron *${borrados}* archivos de la carpeta tmp.`, m)
}

handler.help = ['cleartmp']
handler.tags = ['owner']
handler.command = ['cleartmp', 'borrartmp', 'borrarcarpetatmp', 'vaciartmp']
handler.rowner = true

export default handler