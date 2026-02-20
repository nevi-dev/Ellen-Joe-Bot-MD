let handler = async (m, { conn, usedPrefix }) => {
  let user = global.db.data.users[m.sender]
  if (!user.pokemones) user.pokemones = []
  if (!user.pkMochila) user.pkMochila = { caramelos: 0, huevos: 0, pokebolas: 5 }

  let txt = `🎒 *INVENTARIO POKÉMON* 🎒\n\n`
  txt += `💰 *Monedas:* ${user.coin || 0}\n`
  txt += `🍬 *Caramelos:* ${user.pkMochila.caramelos}\n`
  txt += `🥚 *Huevos:* ${user.pkMochila.huevos}\n`
  txt += `⚪ *Pokébolas:* ${user.pkMochila.pokebolas}\n\n`
  
  txt += `👾 *TU EQUIPO:* (Total: ${user.pokemones.length})\n`
  if (user.pokemones.length === 0) txt += `_Tu equipo está vacío._\n`
  else {
    user.pokemones.forEach((p, i) => {
      txt += `[${i + 1}] ${p.nombre} (Nv. ${p.nivel})\n`
    })
  }
  txt += `\n🔍 Usa *${usedPrefix}pkinfo [ID]* para ver sus estadísticas.`
  m.reply(txt)
}
handler.command = ['pkinventario', 'pkinv']
export default handler
