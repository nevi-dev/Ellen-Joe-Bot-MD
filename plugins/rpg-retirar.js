import db from '../database.js'
import { moveBankToWallet } from '../lib/economy.js'

let handler = async (m, { args }) => {
  const user = db.data.users[m.sender]
  if (!args[0]) return m.reply(`${emoji} Ingresa la cantidad de *${moneda}* que deseas Retirar.`)
  const count = String(args[0]).toLowerCase() === 'all' ? Number(user.bank || 0) : parseInt(args[0])
  if (!Number.isFinite(count) || count < 1) return m.reply(`${emoji2} Debes retirar una cantidad válida.\n > Ejemplo 1 » *#retirar 25000*\n> Ejemplo 2 » *#retirar all*`)
  try {
    moveBankToWallet(m.sender, user, count)
    await m.reply(`${emoji} Retiraste *${count} ${moneda}* del banco, ahora podras usarlo pero tambien podran robartelo.`)
  } catch (error) {
    return m.reply(`${emoji2} ${error.message}. Solo tienes *${user.bank || 0} ${moneda}* en el Banco.`)
  }
}

handler.help = ['retirar']
handler.tags = ['rpg']
handler.command = ['withdraw', 'retirar', 'with']
handler.group = true
handler.register = true

export default handler
