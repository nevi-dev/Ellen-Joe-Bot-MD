let handler = async (m, { conn, args, usedPrefix, command }) => {
  let user = global.db.data.users[m.sender]
  if (!user.pkMochila) user.pkMochila = { caramelos: 0, huevos: 0, pokebolas: 5, superball: 0, ultraball: 0 }

  let items = {
    'pokebola': { precio: 150, key: 'pokebolas', desc: 'Eficacia Baja (35%)' },
    'superball': { precio: 450, key: 'superball', desc: 'Eficacia Media (60%)' },
    'ultraball': { precio: 1000, key: 'ultraball', desc: 'Eficacia Alta (85%)' },
    'caramelo': { precio: 800, key: 'caramelos', desc: 'Sirve para subir nivel/evolucionar' },
    'huevo': { precio: 1500, key: 'huevos', desc: 'Pokémon aleatorio directo' }
  }

  let item = args[0]?.toLowerCase()
  if (!items[item]) {
    let menu = `🛒 **TIENDA POKÉMON** 🛒\n\n`
    for (let i in items) {
      menu += `• *${i}*: 💰${items[i].precio}\n  _${items[i].desc}_\n\n`
    }
    menu += `➡️ Usa: *${usedPrefix}${command} [item]*`
    return m.reply(menu)
  }

  if (user.coin < items[item].precio) return m.reply('❌ No tienes suficientes coins.')

  user.coin -= items[item].precio
  user.pkMochila[items[item].key]++
  m.reply(`✅ Compraste 1 **${item}** con éxito.`)
}
handler.command = ['pktienda']
export default handler
