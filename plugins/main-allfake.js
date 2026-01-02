import pkg from '@whiskeysockets/baileys'
import fs from 'fs'
import fetch from 'node-fetch'
import axios from 'axios'
import moment from 'moment-timezone'
const { generateWAMessageFromContent, prepareWAMessageMedia, proto } = pkg

var handler = m => m

handler.all = async function (m) {

  global.getBuffer = async function getBuffer(url, options) {
    try {
      options ? options : {}
      var res = await axios({
        method: "get",
        url,
        headers: {
          'DNT': 1,
          'User-Agent': 'GoogleBot',
          'Upgrade-Insecure-Request': 1
        },
        ...options,
        responseType: 'arraybuffer'
      })
      return res.data
    } catch (e) {
      console.log(`Error : ${e}`)
    }
  }

  // Cargar base de datos
  const db = './src/database/db.json'
  const db_ = JSON.parse(fs.readFileSync(db))

  // Función para elegir aleatorio
  function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)]
  }

  // Ahora toma los iconos directamente de la base de datos (Categoría imagen)
  const iconUrls = db_.links.imagen 
  const iconUrl = pickRandom(iconUrls)
  global.icono = await getBuffer(iconUrl)

  // Creador y otros
  global.creador = 'Wa.me/18096758983'
  global.ofcbot = `${conn.user.jid.split('@')[0]}`
  global.asistencia = 'Wa.me/18096758983'
  global.namechannel = '*Ellen-Joe-BOT-CHANNEL*'
  global.namechannel2 = '*Ellen-Joe-BOT-CHANNEL*'
  global.namegrupo = '*Ellen-Joe-BOT-OFICIAL*'
  global.namecomu = '*Ellen-Joe-BOT-COMMUNITY*'
  global.listo = '🦈 *Aquí tienes ฅ^•ﻌ•^ฅ*'
  global.fotoperfil = await conn.profilePictureUrl(m.sender, 'image').catch(_ => 'https://files.catbox.moe/xr2m6u.jpg')

  // Ids channel
  global.canalIdM = ["120363418071540900@newsletter", "120363418071540900@newsletter"]
  global.canalNombreM = ["⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏᴇ\'s 𝐒ervice", "⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏᴇ\'s 𝐒ervice"]
  
  // Función para canal random (corregida para usar la variable global)
  async function getRandomChannel() {
    let randomIndex = Math.floor(Math.random() * global.canalIdM.length)
    return { id: global.canalIdM[randomIndex], name: global.canalNombreM[randomIndex] }
  }
  global.channelRD = await getRandomChannel()

  // Fechas
  global.d = new Date(new Date + 3600000)
  global.locale = 'es'
  global.dia = d.toLocaleDateString(locale, {weekday: 'long'})
  global.fecha = d.toLocaleDateString('es', {day: 'numeric', month: 'numeric', year: 'numeric'})
  global.mes = d.toLocaleDateString('es', {month: 'long'})
  global.año = d.toLocaleDateString('es', {year: 'numeric'})
  global.tiempo = d.toLocaleString('en-US', {hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true})

  // Reacciones
  global.rwait = '🕒'
  global.done = '✅'
  global.error = '✖️'
  global.msm = '⚠︎'

  // Emojis Ellen Bot
  global.emoji = '🦈'
  global.emoji2 = '🦈'
  global.emoji3 = '🦈'
  global.emoji4 = '🦈'
  global.emoji5 = '🦈'
  global.emojis = [emoji, emoji2, emoji3, emoji4].getRandom()

  global.wait = '⚘𖠵⃕❖𖥔 𝑪𝒂𝒓𝒈𝒂𝒏𝒅𝒐...ꪶꪾ❍̵̤̂ꫂ\n❝ 𝐴𝑔𝑢aru𝑑𝑒 𝑢𝑛 𝑚𝑜𝑚𝑒𝑛𝑡𝑜 ❞';

  // Enlaces
  var canal = 'https://whatsapp.com/channel/0029VbAuMiNCBtxOKcBfw71x'
  let canal2 = 'https://whatsapp.com/channel/0029VbAuMiNCBtxOKcBfw71x'
  var git = 'https://github.com/nevi-dev'
  var github = 'https://github.com/nevi-dev/Ellen-Joe-Bot-MD' 
  let correo = 'nevijose4@gmail.com'
  global.redes = [canal, canal2, git, github, correo].getRandom()

  // Imagen aleatoria para global.icons
  const randomlink = pickRandom(db_.links.imagen)
  const response = await fetch(randomlink)
  global.icons = await response.buffer()

  // Saludo por hora
  var ase = new Date(); var hour = ase.getHours();
  switch(hour){
    case 0: case 1: case 2: hour = 'Lɪɴᴅᴀ Nᴏᴄʜᴇ 🌃'; break;
    case 3: case 4: case 5: case 6: case 8: case 9: hour = 'Lɪɴᴅᴀ Mᴀɴ̃ᴀɴᴀ 🌄'; break;
    case 7: hour = 'Lɪɴᴅᴀ Mᴀɴ̃ᴀɴᴀ 🌅'; break;
    case 10: case 11: case 12: case 13: hour = 'LɪɴᴅO DɪA 🌤'; break;
    case 14: case 15: case 16: case 17: hour = 'LɪɴᴅA TᴀʀᴅE 🌆'; break;
    default: hour = 'LɪɴᴅA NᴏᴄʜE 🌃'
  }
  global.saludo = hour

  global.nombre = m.pushName || 'Anónimo'
  global.taguser = '@' + m.sender.split("@")[0]
  var more = String.fromCharCode(8206)
  global.readMore = more.repeat(850)

  global.packsticker = `°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°\n🦈 Usuario: ${nombre}\n🦈 Bot: ${botname}\n🦈 Fecha: ${fecha}\n🦈 Hora: ${tiempo}`;

  global.rcanal = {
    contextInfo: {
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: channelRD.id,
        serverMessageId: 100,
        newsletterName: channelRD.name,
      },
      externalAdReply: {
        showAdAttribution: true,
        title: botname,
        body: dev,
        mediaUrl: null,
        description: null,
        previewType: "PHOTO",
        thumbnail: global.icono,
        sourceUrl: global.redes,
        mediaType: 1,
        renderLargerThumbnail: false
      },
    }
  }
}

export default handler
