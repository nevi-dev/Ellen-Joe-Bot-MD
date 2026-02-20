import fetch from 'node-fetch'

let handler = async (m, { conn }) => {
  let user = global.db.data.users[m.sender]
  let time = user.lastHuevo + 3600000 // 1 Hora de cooldown
  if (new Date - user.lastHuevo < 3600000) return m.reply(`⏳ Ya has incubado un huevo. Espera ${msToTime(time - new Date())}`)
  
  if (!user.pkMochila?.huevos || user.pkMochila.huevos <= 0) return m.reply('❌ No tienes huevos en el inventario.')

  user.pkMochila.huevos--
  user.lastHuevo = new Date * 1

  let randomID = Math.floor(Math.random() * 898) + 1
  // Aquí asumo que tienes la función buildPokemonObj definida globalmente o importada
  let pokemon = await buildPokemonObj(randomID, 1) 
  
  user.pokemones.push(pokemon)
  
  let txt = `🐣 *¡UN HUEVO HA ECLOSIONADO!*\n\n`
  txt += `✨ ¡Felicidades! **${pokemon.nombre}** se ha unido a tu equipo directamente.`
  
  conn.sendFile(m.chat, pokemon.imagen, 'huevo.png', txt, m)
}
handler.command = ['pkincubar', 'pkhuevo']
export default handler

function msToTime(duration) {
  let minutes = Math.floor((duration / (1000 * 60)) % 60),
  hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  return `${hours}h ${minutes}m`
}
