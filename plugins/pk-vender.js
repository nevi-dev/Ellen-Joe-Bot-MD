let handler = async (m, { conn, args, usedPrefix, command }) => {
  let user = global.db.data.users[m.sender]
  
  if (!user.pkPiedras) user.pkPiedras = { fuego: 0, agua: 0, trueno: 0, hoja: 0, lunar: 0, solar: 0 }
  if (args.length === 0) return m.reply(`💡 **¿Qué deseas vender?**\n\n• *${usedPrefix}${command} [ID]* -> Vende un Pokémon.\n• *${usedPrefix}${command} fuego 2* -> Vende 2 piedras fuego (💰500 c/u).`)

  let item = args[0].toLowerCase()
  let cantidad = Math.max(1, parseInt(args[1] || 1))

  // --- LÓGICA PARA VENDER PIEDRAS ---
  if (user.pkPiedras.hasOwnProperty(item)) {
    if (user.pkPiedras[item] < cantidad) {
      return m.reply(`❌ No tienes suficientes piedras **${item.toUpperCase()}**. (Tienes: ${user.pkPiedras[item]})`)
    }

    let precioPiedra = 500
    let ganancia = precioPiedra * cantidad
    
    user.pkPiedras[item] -= cantidad
    user.coin = (user.coin || 0) + ganancia

    return m.reply(`💰 **VENTA DE SUMINISTROS**\n\nHas vendido **${cantidad} Piedra(s) ${item.toUpperCase()}**.\n💵 Ganancia: 💰${ganancia}\n✨ Saldo actual: 💰${user.coin}`)
  }

  // --- LÓGICA PARA VENDER POKÉMON (MULTIVENTA) ---
  let idsAVender = [...new Set(args.map(v => parseInt(v) - 1))]
    .filter(id => !isNaN(id) && user.pokemones && user.pokemones[id])
    .sort((a, b) => b - a)

  if (idsAVender.length > 0) {
    if (idsAVender.length >= user.pokemones.length) {
      return m.reply('⚠️ No puedes vender a todo tu equipo.')
    }

    let totalVenta = 0
    let nombres = []

    for (let id of idsAVender) {
      let p = user.pokemones[id]
      let precio = Math.floor(p.nivel * 100 + 50)
      totalVenta += precio
      nombres.push(p.nombre)
      user.pokemones.splice(id, 1)
    }

    user.coin = (user.coin || 0) + totalVenta
    return m.reply(`💰 **VENTA DE POKÉMON**\n\n✅ Vendidos: ${nombres.join(', ')}\n💵 Total: 💰${totalVenta}\n✨ Saldo: 💰${user.coin}`)
  }

  m.reply(`❌ No reconozco el objeto o ID: "${item}".\nUsa: *${usedPrefix}pkinv* para ver qué tienes.`)
}

handler.command = ['pkvender', 'pksell']
export default handler
