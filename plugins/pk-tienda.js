let handler = async (m, { args, usedPrefix, command }) => {
  let user = global.db.data.users[m.sender]
  
  // CORRECCIÓN: Inicializar sin borrar lo existente
  if (!user.pkMochila) user.pkMochila = { pokebolas: 0, superball: 0, ultraball: 0, caramelos: 0, huevos: 0 }
  if (user.coin === undefined) user.coin = 0

  let items = {
    'pokebola': { p: 150, k: 'pokebolas' },
    'superball': { p: 450, k: 'superball' },
    'ultraball': { p: 1000, k: 'ultraball' },
    'caramelo': { p: 800, k: 'caramelos' },
    'huevo': { p: 2000, k: 'huevos' }
  }

  let item = args[0]?.toLowerCase()
  
  if (!items[item]) {
    let menu = `🛒 *TIENDA POKÉMON*\n\n`
    menu += Object.keys(items).map(i => `• *${i}*: 💰${items[i].p}`).join('\n')
    menu += `\n\n📌 **Ejemplo:** \`${usedPrefix}${command} huevo 2\``
    return m.reply(menu)
  }

  let cantidad = Math.max(1, parseInt(args[1] || 1))
  if (isNaN(cantidad)) return m.reply(`❌ La cantidad debe ser un número.`)

  let costoTotal = items[item].p * cantidad

  if (user.coin < costoTotal) {
    return m.reply(`❌ No tienes suficiente dinero. Necesitas 💰**${costoTotal}** monedas.`)
  }

  // Procesar compra
  user.coin -= costoTotal
  
  // Asegurar que la propiedad específica exista antes de sumar
  let key = items[item].k
  user.pkMochila[key] = (user.pkMochila[key] || 0) + cantidad

  m.reply(`✅ Compraste **${cantidad} ${item}(s)** por 💰**${costoTotal}** monedas.`)
}

handler.command = ['pktienda']
export default handler
