import db from '../database.js'
let tradeProposals = {} // Memoria para intercambios pendientes

let handler = async (m, { conn, args, command, usedPrefix }) => {
  if (!m.quoted) return m.reply('❌ Responde al mensaje de alguien.')
  
  let user = db.data.users[m.sender]
  let target = m.quoted.sender
  let targetUser = db.data.users[target]

  // --- DONAR: Dar sin pedir nada ---
  if (command === 'pkdonar') {
    let pIdx = parseInt(args[0]) - 1
    if (!user.pokemones[pIdx]) return m.reply('❌ ID de Pokémon inválido.')
    
    let poke = user.pokemones.splice(pIdx, 1)[0]
    targetUser.pokemones.push(poke)
    
    return m.reply(`🎁 ¡Regalo enviado! @${target.split('@')[0]} ha recibido tu **${poke.nombre}**.`, null, { mentions: [target] })
  }

  // --- TRADE: Intercambio Mutuo ---
  if (command === 'pktrade') {
    let pIdx = parseInt(args[0]) - 1
    if (!user.pokemones[pIdx]) return m.reply('❌ Selecciona el ID del Pokémon que quieres dar.')

    // Si el oponente acepta la propuesta
    if (args[1] === 'aceptar') {
      let propuesta = tradeProposals[target] 
      if (!propuesta || propuesta.hacia !== m.sender) return m.reply('❌ No tienes propuestas de intercambio de esta persona.')

      let pIdxTarget = propuesta.pIdx
      let p1 = user.pokemones[pIdx] // El de quien acepta
      let p2 = targetUser.pokemones[pIdxTarget] // El de quien propuso

      // Ejecutar el intercambio
      user.pokemones.splice(pIdx, 1)
      targetUser.pokemones.splice(pIdxTarget, 1)
      
      user.pokemones.push(p2)
      targetUser.pokemones.push(p1)

      delete tradeProposals[target]
      return m.reply(`🤝 ¡INTERCAMBIO EXITOSO!\n\n@${m.sender.split('@')[0]} recibió: **${p2.nombre}**\n@${target.split('@')[0]} recibió: **${p1.nombre}**`, null, { mentions: [m.sender, target] })
    }

    // Crear nueva propuesta
    tradeProposals[m.sender] = { hacia: target, pIdx: pIdx }
    let txt = `🤝 @${m.sender.split('@')[0]} quiere tradear su **${user.pokemones[pIdx].nombre}** por uno de los tuyos.\n\n`
    txt += `Para aceptar escribe:\n*${usedPrefix}pktrade [ID de TU Pokémon] aceptar*`
    return m.reply(txt, null, { mentions: [m.sender] })
  }
}

handler.command = ['pkdonar', 'pktrade']
export default handler
