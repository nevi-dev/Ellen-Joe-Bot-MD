import db from '../database.js'
import { moveWalletToBank } from '../lib/economy.js'

let handler = async (m, { args }) => {
  const user = db.data.users[m.sender]
  if (!args[0]) return m.reply(`${emoji} Ingresa la cantidad de *${moneda}* que deseas Depositar.`)
  const count = String(args[0]).toLowerCase() === 'all' ? Number(user.coin || 0) : parseInt(args[0])
  if (!Number.isFinite(count) || count < 1) return m.reply(`${emoji2} Debes depositar una cantidad válida.\n> Ejemplo 1 » *#d 25000*\n> Ejemplo 2 » *#d all*`)
  try {
    moveWalletToBank(m.sender, user, count)
    await m.reply(`${emoji} Depositaste *${count} ${moneda}* en el banco, ya no podran robartelo.`)
  } catch (error) {
    return m.reply(`${emoji2} ${error.message}. Solo tienes *${user.coin || 0} ${moneda}* en la Cartera.`)
  }
}

handler.help = ['depositar']
handler.tags = ['rpg']
handler.command = ['deposit', 'depositar', 'd', 'aguardar']
handler.group = true
handler.register = true

export default handler
