let handler = async (m, { conn, usedPrefix }) => {
  let user = global.db.data.users[m.sender]
  
  // Inicialización de seguridad
  if (!user.pkMochila) user.pkMochila = { caramelos: 0, huevos: 0, pokebolas: 5, superball: 0, ultraball: 0 }
  if (!user.pokemones) user.pokemones = []

  let txt = `🎒 **INVENTARIO POKÉMON** 🎒\n\n`
  txt += `💰 **Coins:** ${user.coin || 0}\n`
  txt += `🍬 **Caramelos:** ${user.pkMochila.caramelos}\n`
  txt += `🥚 **Huevos:** ${user.pkMochila.huevos}\n\n`
  
  txt += `⚪ **Pokébolas:** ${user.pkMochila.pokebolas}\n`
  txt += `🔵 **Super Balls:** ${user.pkMochila.superball}\n`
  txt += `🟡 **Ultra Balls:** ${user.pkMochila.ultraball}\n\n`
  
  txt += `━━━━━━━━━━━━━━━━━━━━\n`
  txt += `👾 **TU EQUIPO POKÉMON** (${user.pokemones.length}/20)\n`
  txt += `━━━━━━━━━━━━━━━━━━━━\n\n`

  if (user.pokemones.length === 0) {
    txt += `_No tienes Pokémon en tu equipo aún._\n_¡Usa .pokemon para buscar uno!_`
  } else {
    user.pokemones.forEach((p, i) => {
      // Si por algún error no tiene HP definido, ponemos un valor por defecto o '??'
      let health = (p.hp !== undefined) ? `${p.hp}/${p.maxHp}` : '??'
      txt += `**[${i + 1}]** ${p.nombre}\n`
      txt += `   ⭐ Nivel: ${p.nivel} | 💖 HP: ${health}\n`
      txt += `   ✨ Tipo: ${p.tipos ? p.tipos.join('/') : 'Normal'}\n\n`
    })
  }
  
  txt += `━━━━━━━━━━━━━━━━━━━━\n`
  txt += `🔍 Usa *${usedPrefix}pkinfo [ID]* para ver ataques.\n`
  txt += `🏥 Usa *${usedPrefix}pkheal [ID]* para curar.`

  m.reply(txt)
}

handler.command = ['pkinventario', 'pkinv']
export default handler
