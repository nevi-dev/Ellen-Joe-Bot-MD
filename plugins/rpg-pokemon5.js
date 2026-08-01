import db from '../database.js'
let handler = async (m, { conn, args, usedPrefix, command }) => {
  let user = db.data.users[m.sender]
  
  // --- BLOQUEO DE SEGURIDAD ---
  // Importamos o verificamos las variables de duelos (deben ser las mismas que en tus otros archivos)
  // Nota: Si duelosActivos y ligaCombates no son globales, asegúrate de que sean accesibles.
  if (global.duelosActivos?.[m.sender] || global.ligaCombates?.[m.sender]) {
    return m.reply('❌ **¡No puedes usar el Centro Pokémon en medio de una batalla!**\nTermina tu combate actual antes de curar a tus Pokémon.')
  }

  if (!user.pokemones || user.pokemones.length === 0) return m.reply('❌ No tienes Pokémon que curar.')

  let precioHeal = 150 
  let miIdx = parseInt(args[0]) - 1

  if (isNaN(miIdx)) {
    let txt = `🏥 **CENTRO POKÉMON** 🏥\n\n`
    txt += `💰 *Costo de consulta:* ${precioHeal} coins\n`
    txt += `━━━━━━━━━━━━━━━━━━━━\n`
    user.pokemones.forEach((p, i) => {
      let salud = (p.hp === undefined || p.hp === null) ? '⚠️ DAÑADO' : `💖 ${p.hp} HP`
      txt += `[${i + 1}] ${p.nombre} (Nv. ${p.nivel}) - ${salud}\n`
    })
    txt += `━━━━━━━━━━━━━━━━━━━━\n`
    txt += `➡️ Usa: *${usedPrefix}${command} [ID]* para curar.`
    return m.reply(txt)
  }

  let p = user.pokemones[miIdx]
  if (!p) return m.reply('❌ ID de Pokémon no válida.')

  if (user.coin < precioHeal) return m.reply(`❌ No tienes suficiente dinero. Necesitas ${precioHeal} coins.`)

  // --- REPARACIÓN Y CURACIÓN ---
  if (p.hp === undefined || p.hp === null || isNaN(p.hp)) {
    p.hp = Math.floor(50 + (p.nivel * 5)) 
    p.maxHp = p.hp 
  } else {
    p.hp = p.maxHp || Math.floor(50 + (p.nivel * 5))
  }

  user.coin -= precioHeal

  let healMsg = `🏥 **¡TU ${p.nombre} HA SIDO RESTABLECIDO!**\n\n`
  healMsg += `💖 **HP:** ${p.hp}\n`
  healMsg += `💰 **Costo:** ${precioHeal} coins\n`
  healMsg += `✨ ¡Ya puedes volver a la batalla!`

  return m.reply(healMsg)
}

handler.command = ['pkheal', 'pkcurar']
export default handler
