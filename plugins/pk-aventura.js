import db from '../database.js'
let handler = async (m, { conn, usedPrefix }) => {
  let user = db.data.users[m.sender]
  
  // Inicialización de inventarios por si no existen
  if (!user.pkPiedras) user.pkPiedras = { fuego: 0, agua: 0, trueno: 0, hoja: 0, lunar: 0, solar: 0 }
  if (!user.pkMochila) user.pkMochila = { caramelos: 0, huevos: 0, pokebolas: 0 }
  
  // Cooldown de 5 minutos
  let cooldown = 300000 
  if (new Date() - (user.lastAventura || 0) < cooldown) {
    let tiempo = (user.lastAventura + cooldown) - new Date()
    return m.reply(`⏳ Estás cansado de tanto caminar. Espera **${msToTime(tiempo)}** para volver a salir de aventura.`)
  }

  user.lastAventura = new Date() * 1
  
  // Probabilidades de encuentro
  let azar = Math.random() * 100
  let txt = `🎒 **BITÁCORA DE AVENTURA** 🎒\n\n`
  
  if (azar < 15) { 
    // ENCONTRAR PIEDRA
    let piedras = ['fuego', 'agua', 'trueno', 'hoja', 'lunar', 'solar']
    let piedra = piedras[Math.floor(Math.random() * piedras.length)]
    user.pkPiedras[piedra]++
    txt += `💎 ¡Increíble! Explorando una cueva encontraste una **Piedra ${piedra.toUpperCase()}**.\n`
    txt += `✨ Úsala para evolucionar con *${usedPrefix}pkevolucionar*.`
    
  } else if (azar < 40) {
    // ENCONTRAR CARAMELOS
    let cant = Math.floor(Math.random() * 5) + 1
    user.pkMochila.caramelos += cant
    txt += `🍬 En el camino viste a un Prof. Pokémon que te regaló **${cant} Caramelos Raros**.\n`
    txt += `✨ Úsalos para subir de nivel con *${usedPrefix}pkupgrade*.`

  } else if (azar < 70) {
    // ENCONTRAR MONEDAS
    let coins = Math.floor(Math.random() * 500) + 200
    user.coin = (user.coin || 0) + coins
    txt += `💰 ¡Viste algo brillar en la hierba alta! Encontraste **${coins} monedas** tiradas.`

  } else if (azar < 90) {
    // ENCONTRAR POKEBOLAS
    let balls = Math.floor(Math.random() * 3) + 1
    user.pkMochila.pokebolas += balls
    txt += `⚪ ¡Encontraste un paquete perdido! Contenía **${balls} Pokébolas**.`

  } else {
    // EVENTO VACÍO O PELIGROSO
    txt += `🌿 Caminaste por horas pero no encontraste nada interesante... ¡Mejor suerte la próxima!`
  }

  m.reply(txt)
}

handler.command = ['pkaventura']
export default handler

function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60),
      minutes = Math.floor((duration / (1000 * 60)) % 60)
  return `${minutes}m ${seconds}s`
}
