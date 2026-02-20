let handler = async (m, { args, usedPrefix, command }) => {
  let user = global.db.data.users[m.sender]
  
  // Aseguramos que la mochila exista para evitar errores
  if (!user.pkMochila) user.pkMochila = { pokebolas: 0, superball: 0, ultraball: 0, caramelos: 0, huevos: 0 }

  let items = {
    'pokebola': { p: 150, k: 'pokebolas' },
    'superball': { p: 450, k: 'superball' },
    'ultraball': { p: 1000, k: 'ultraball' },
    'caramelo': { p: 800, k: 'caramelos' },
    'huevo': { p: 2000, k: 'huevos' }
  }

  let item = args[0]?.toLowerCase()
  
  // Si no elige un item válido, mostrar catálogo
  if (!items[item]) {
    let menu = `🛒 *TIENDA POKÉMON*\n\n`
    menu += Object.keys(items).map(i => `• *${i}*: 💰${items[i].p}`).join('\n')
    menu += `\n\n📌 **Ejemplo:** \`${usedPrefix}${command} caramelo 10\``
    return m.reply(menu)
  }

  // Validar cantidad (si no se pone nada, cantidad = 1)
  let cantidad = Math.max(1, parseInt(args[1] || 1))
  
  if (isNaN(cantidad)) return m.reply(`❌ La cantidad debe ser un número. Ejemplo: \`${usedPrefix}${command} ${item} 5\``)

  let costoTotal = items[item].p * cantidad

  // Verificar si tiene dinero suficiente
  if (user.coin < costoTotal) {
    return m.reply(`❌ No tienes suficiente dinero. Necesitas 💰**${costoTotal}** para comprar **${cantidad} ${item}(s)**.`)
  }

  // Procesar compra
  user.coin -= costoTotal
  user.pkMochila[items[item].k] += cantidad

  m.reply(`✅ Compraste **${cantidad} ${item}(s)** por 💰**${costoTotal}** monedas.`)
}

handler.command = ['pktienda']
export default handler
