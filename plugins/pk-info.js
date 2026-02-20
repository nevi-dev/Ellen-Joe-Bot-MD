let handler = async (m, { conn, args, usedPrefix }) => {
  let user = global.db.data.users[m.sender]
  let id = parseInt(args[0]) - 1

  if (!user.pokemones || !user.pokemones[id]) {
    return m.reply(`❌ ID de Pokémon no válido. Usa *${usedPrefix}pkinv* para ver tus IDs.`)
  }

  let p = user.pokemones[id]
  
  let txt = `📝 **EXPEDIENTE POKÉMON**\n\n`
  txt += `👾 **Nombre:** ${p.nombre}\n`
  txt += `⭐ **Nivel:** ${p.nivel}\n`
  txt += `✨ **Tipo:** ${p.tipos.join(' / ')}\n\n`
  
  txt += `📊 **ESTADÍSTICAS:**\n`
  txt += `💖 HP: ${p.hp}/${p.maxHp}\n`
  txt += `⚔️ ATK: ${p.atk} | 🛡️ DEF: ${p.def}\n`
  txt += `⚡ VEL: ${p.speed || '??'}\n\n`
  
  txt += `🔥 **MOVIMIENTOS:**\n`
  if (p.moves && p.moves.length > 0) {
    p.moves.forEach(m => {
      txt += ` • ${m.nombre} (${m.tipo}) - Pwr: ${m.poder}\n`
    })
  } else {
    txt += ` _Este Pokémon no conoce movimientos._`
  }

  return conn.sendFile(m.chat, p.imagen, 'info.png', txt, m)
}

handler.command = ['pkinfo']
export default handler
