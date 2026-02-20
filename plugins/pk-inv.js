let handler = async (m, { conn }) => {
  let user = global.db.data.users[m.sender]
  if (!user.pkMochila) user.pkMochila = { caramelos: 0, huevos: 0, pokebolas: 5, superball: 0, ultraball: 0 }

  let txt = `🎒 **INVENTARIO POKÉMON** 🎒\n\n`
  txt += `💰 **Coins:** ${user.coin || 0}\n`
  txt += `🍬 **Caramelos:** ${user.pkMochila.caramelos}\n`
  txt += `🥚 **Huevos:** ${user.pkMochila.huevos}\n\n`
  
  txt += `⚪ **Pokébolas:** ${user.pkMochila.pokebolas}\n`
  txt += `🔵 **Super Balls:** ${user.pkMochila.superball}\n`
  txt += `🟡 **Ultra Balls:** ${user.pkMochila.ultraball}\n\n`
  
  txt += `👾 **EQUIPO:** ${user.pokemones?.length || 0} Pokémon.\n`
  txt += `➡️ Usa *.pkinfo [ID]* para ver detalles.`
  m.reply(txt)
}
handler.command = ['pkinventario', 'pkinv']
export default handler
