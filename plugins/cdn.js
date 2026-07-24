import fetch from 'node-fetch'
import FormData from 'form-data'

let handler = async (m, { conn }) => {
  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ''
  
  if (!mime) return conn.reply(m.chat, `${emoji} Por favor, responda a un archivo, imagen o vídeo.`, m)
  
  await m.react(rwait)
  
  try {
    let media = await q.download()
    
    // Preparar FormData para emular la subida curl
    const form = new FormData()
    form.append('file', media, {
      filename: `file_${Date.now()}.${mime.split('/')[1] || 'bin'}`,
      contentType: mime
    })
    form.append('expiration', '24h') // Configurado a 24 Horas

    // Petición a la CDN
    let res = await fetch('https://cdn.apicausas.xyz/api/upload', {
      method: 'POST',
      headers: {
        'x-api-key': '246da193955f6d9b57dc094fcfd8330e7ecd3964d41097b2c8be97e9a0f69dff',
        ...form.getHeaders()
      },
      body: form
    })

    let json = await res.json()

    // Validar si la CDN respondió con éxito
    if (!json.success || !json.url) {
      throw new Error('Error al subir el archivo a la CDN')
    }

    // Armar el mensaje utilizando las propiedades del JSON
    let txt = `乂  *C D N - U P L O A D*  乂\n\n`
        txt += `*» Enlace* : ${json.url}\n`
        txt += `*» Nombre* : ${json.saved_filename || json.file}\n`
        txt += `*» Tamaño* : ${json.size_human || formatBytes(media.length)}\n`
        txt += `*» Velocidad* : ${json.upload_speed?.human_speed || 'N/A'}\n`
        txt += `*» Expiración* : 24 Horas (${json.expires_at})\n\n`
        txt += `> *${dev}*`

    await conn.reply(m.chat, txt, m)
    await m.react(done)
  } catch (e) {
    console.error(e)
    await m.react(error)
  }
}

handler.help = ['cdn', 'tourl4']
handler.tags = ['transformador']
handler.register = true
handler.command = ['cdn', 'tourl4'] // Comandos solicitados

export default handler

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`
}
