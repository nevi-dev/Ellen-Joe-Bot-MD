let handler = async (m, { conn, args, usedPrefix }) => {
  let user = global.db.data.users[m.sender]
  let id = parseInt(args[0]) - 1

  if (!user.pokemones || !user.pokemones[id]) {
    return m.reply(`❌ Selecciona un ID válido de tu inventario.\nEjemplo: *${usedPrefix}pkvender 1*`)
  }

  // No permitir vender si solo tiene uno (opcional, para evitar que se quede sin nada)
  if (user.pokemones.length <= 1) {
    return m.reply('⚠️ No puedes vender tu último Pokémon, ¡necesitas al menos uno para luchar!')
  }

  let p = user.pokemones[id]
  let precioVenta = Math.floor(p.nivel * 100 + 50) // Precio base según nivel

  // Eliminar del array y dar dinero
  user.pokemones.splice(id, 1)
  user.coin = (user.coin || 0) + precioVenta

  let txt = `💰 **¡VENTA REALIZADA!**\n\n`
  txt += `Has vendido a **${p.nombre}** por **${precioVenta} coins**.\n`
  txt += `✨ Dinero actual: 💰${user.coin}`

  return m.reply(txt)
}

handler.command = ['pkvender']
export default handler
