import db from '../database.js'
import economy, { BOT_CURRENCY, FOREIGN_CURRENCY, applyJob, formatMoney, getAccountByUser, getEconomySnapshot, getTransactions, issueCard, listBanks, listJobs, openBankAccount, cashOutCard, loadCard, repayLoan, requestLoan, stealCard, transferByAccount } from '../lib/economy.js'

const menu = (usedPrefix) => `🦈 *Ellen Joe Financial Suite*

— Ajá... banca de New Eridu, sin drama.

*Banca*
• ${usedPrefix}bancos — ver bancos disponibles
• ${usedPrefix}abrircuenta <codigo> — abrir cuenta
• ${usedPrefix}saldo — estado financiero
• ${usedPrefix}transferircuenta <cuenta> <monto> — transferencia por número
• ${usedPrefix}historial [pagina] — movimientos

*Trabajo y crédito*
• ${usedPrefix}empleos — ofertas laborales
• ${usedPrefix}aplicar <codigo> — firmar contrato
• ${usedPrefix}tarjeta — emitir débito
• ${usedPrefix}robar-tarjeta <16 digitos> — vaciar fondos expuestos
• ${usedPrefix}prestamo <monto> — solicitar préstamo
• ${usedPrefix}pagarprestamo <monto> — pagar deuda
• ${usedPrefix}recargartarjeta <numero> <monto> — mover banco a tarjeta
• ${usedPrefix}cobrartarjeta <numero> — pasar tarjeta a efectivo

*Mercado*
• Tasa dinámica: 1 ${FOREIGN_CURRENCY} = ${economy.getExchangeRate()} ${BOT_CURRENCY}`

const professionalHistory = (rows, page) => {
  if (!rows.length) return `📄 *Estado de Cuenta — Página ${page}*\n\nSin movimientos. Qué tranquilo... demasiado.`
  const lines = rows.map((tx) => {
    const sign = tx.type === 'ingreso' ? '+' : '-'
    const date = new Date(tx.created_at * 1000).toLocaleString('es-DO', { timeZone: 'America/Santo_Domingo' })
    return `#${tx.id} | ${date}\n${sign} ${formatMoney(tx.amount, tx.currency)} — ${tx.concept}\nOrigen: ${tx.source || 'N/A'} → Destino: ${tx.destination || 'N/A'}`
  })
  return `🏦 *Estado de Cuenta Victoria Housekeeping*\nPágina ${page} · Últimos 10 movimientos\n\n${lines.join('\n\n')}`
}

let handler = async (m, { args, command, usedPrefix }) => {
  const user = db.data.users[m.sender] || (db.data.users[m.sender] = {})
  try {
    if (['finanzas', 'finance'].includes(command)) return m.reply(menu(usedPrefix))

    if (command === 'bancos') {
      return m.reply(`🏦 *Bancos disponibles*\n\n${listBanks().map(b => `*${b.code}* — ${b.name}\nInterés: ${(b.interest_rate * 100).toFixed(2)}% · Mant.: ${formatMoney(b.maintenance_fee)} · Tax interbancario: ${(b.interbank_tax_rate * 100).toFixed(2)}%`).join('\n\n')}`)
    }

    if (command === 'abrircuenta') {
      const account = openBankAccount(m.sender, String(args[0] || '').toUpperCase())
      return m.reply(`🦈 *Cuenta lista.*\nBanco: ${account.bank_name}\nNúmero de cuenta: *${account.account_number}*\n— Guárdalo. Las transferencias usan ese número, no menciones.`)
    }

    if (['saldo', 'balance2'].includes(command)) {
      const account = getAccountByUser(m.sender)
      const snap = getEconomySnapshot()
      return m.reply(`🏦 *Estado Financiero de New Eridu*\n\nCuenta: ${account?.account_number || 'Sin cuenta'}\nBanco: ${account?.bank_name || 'No registrado'}\nEfectivo: ${formatMoney(user.coin)}\nBanco: ${formatMoney(user.bank)}\nPremium: ${formatMoney(user.dennyPremium, FOREIGN_CURRENCY)}\nCredit Score: ${user.creditScore || 600}\n\nCambio: 1 ${FOREIGN_CURRENCY} = ${snap.exchangeRate} ${BOT_CURRENCY}\nMasa monetaria: ${formatMoney(snap.totalMoney)}`)
    }

    if (command === 'transferircuenta') {
      const [accountNumber, amountRaw] = args
      const result = transferByAccount(m.sender, accountNumber, amountRaw)
      return m.reply(`✅ *Transferencia completada.*\nDestino: ${result.to.account_number} (${result.to.bank_name})\nMonto: ${formatMoney(result.amount)}\nImpuestos: ${formatMoney(result.tax)}\n— Hecho. No lo gastes todo en fideos.`)
    }

    if (['historial', 'movimientos'].includes(command)) return m.reply(professionalHistory(getTransactions(m.sender, Number(args[0] || 1)), Math.max(1, Number(args[0] || 1))))

    if (command === 'empleos') return m.reply(`💼 *Bolsa laboral Hollow/Victoria*\n\n${listJobs().map(j => `*${j.code}* — ${j.title}\nSalario quincenal: ${formatMoney(j.salary, j.currency)} · Riesgo ${j.risk}/3`).join('\n\n')}`)

    if (command === 'aplicar') {
      const job = applyJob(m.sender, String(args[0] || '').toLowerCase())
      return m.reply(`📝 *Contrato firmado.*\nPuesto: ${job.title}\nSalario quincenal: ${formatMoney(job.salary, job.currency)}\nFecha de contratación: ${new Date().toLocaleString('es-DO', { timeZone: 'America/Santo_Domingo' })}\n— Si entras tarde, cobras prorrateado. Justo, no cruel.`)
    }

    if (command === 'tarjeta') {
      const card = issueCard(m.sender)
      return m.reply(`💳 *Tarjeta emitida*\nNúmero: *${card.cardNumber}*\nVence: ${String(card.month).padStart(2, '0')}/${card.year}\nCVV: ${card.cvv}\n— No compartas el número. En serio. Aquí la gente roba.`)
    }

    if (command === 'recargartarjeta') return m.reply(`💳 *Tarjeta recargada.*\nMonto: ${formatMoney(loadCard(m.sender, args[0], args[1]))}`)

    if (command === 'cobrartarjeta') return m.reply(`💸 *Fondos movidos a efectivo.*\nMonto: ${formatMoney(cashOutCard(m.sender, args[0]))}`)

    if (command === 'robar-tarjeta') return m.reply(`🕶️ *Operación turbia completada.*\nBotín: ${formatMoney(stealCard(m.sender, args[0]))}\n— Si la expusieron en chat, no era segura.`)

    if (command === 'pagarprestamo') {
      const paid = repayLoan(m.sender, args[0])
      return m.reply(`✅ *Pago aplicado.*\nPagado: ${formatMoney(paid.paid)}\nPendiente: ${formatMoney(paid.outstanding)}`)
    }

    if (command === 'prestamo') {
      const loan = requestLoan(m.sender, args[0])
      return m.reply(`🏦 *Préstamo aprobado.*\nDesembolso: ${formatMoney(loan.amount)}\nCuota semanal: ${formatMoney(loan.weekly)}\nPrimer vencimiento: ${new Date(loan.due * 1000).toLocaleDateString('es-DO', { timeZone: 'America/Santo_Domingo' })}`)
    }
  } catch (error) {
    return m.reply(`*— Tsk.* ${error.message}`)
  }
}

handler.help = ['finanzas', 'bancos', 'abrircuenta <codigo>', 'saldo', 'transferircuenta <cuenta> <monto>', 'historial [pagina]', 'empleos', 'aplicar <codigo>', 'tarjeta', 'robar-tarjeta <numero>', 'prestamo <monto>', 'pagarprestamo <monto>', 'recargartarjeta <numero> <monto>', 'cobrartarjeta <numero>']
handler.tags = ['economy']
handler.command = ['finanzas', 'finance', 'bancos', 'abrircuenta', 'saldo', 'balance2', 'transferircuenta', 'historial', 'movimientos', 'empleos', 'aplicar', 'tarjeta', 'robar-tarjeta', 'prestamo', 'pagarprestamo', 'recargartarjeta', 'cobrartarjeta']
handler.register = true
handler.group = true

export default handler
