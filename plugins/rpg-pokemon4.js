let handler = async (m, { conn, args, usedPrefix, command }) => {
  let user = global.db.data.users[m.sender]
  if (!user.pokemones) user.pokemones = []

  // REGALAR POKEMON
  if (command === 'donarpokemon' || command === 'regalarpokemon') {
    let target = m.mentionedJid?.[0] || m.quoted?.sender
    if (!target) return conn.reply(m.chat, `❌ Menciona a alguien\n\nEjemplo: *${usedPrefix + command} @usuario 1*`, m)
    if (target === m.sender) return conn.reply(m.chat, '❌ No puedes regalarte a ti mismo', m)

    let index = parseInt(args[1]) - 1
    if (isNaN(index) || !user.pokemones[index]) return conn.reply(m.chat, `❌ Número de pokemon inválido. Usa *${usedPrefix}mispokemon* para ver tu lista`, m)

    let targetUser = global.db.data.users[target]
    if (!targetUser) return conn.reply(m.chat, '❌ El usuario no está registrado', m)
    if (!targetUser.pokemones) targetUser.pokemones = []

    let pokemon = user.pokemones.splice(index, 1)[0]
    targetUser.pokemones.push(pokemon)

    conn.reply(m.chat, `✅ *¡Regalaste a ${pokemon.nombre} a @${target.split('@')[0]}!*`, m, { mentionedJid: [target] })
    return
  }

  // VENDER POKEMON
  if (command === 'venderpokemon') {
    let index = parseInt(args[0]) - 1
    if (isNaN(index) || !user.pokemones[index]) return conn.reply(m.chat, `❌ Número de pokemon inválido. Usa *${usedPrefix}mispokemon* para ver tu lista`, m)

    let pokemon = user.pokemones.splice(index, 1)[0]
    let precio = Math.floor((pokemon.ataque + pokemon.defensa + pokemon.hp) * 1.5)
    user.coin += precio

    conn.reply(m.chat, `✅ *Vendiste a ${pokemon.nombre} por ${precio} ${global.moneda}*`, m)
    return
  }

  // PELEAR
  if (command === 'pokemonpelea' || command === 'pkpelea') {
    let target = m.mentionedJid?.[0] || m.quoted?.sender
    if (!target) return conn.reply(m.chat, `❌ Menciona a alguien\n\nEjemplo: *${usedPrefix + command} @usuario 1 1*`, m)
    if (target === m.sender) return conn.reply(m.chat, '❌ No puedes pelear contigo mismo', m)

    let myIndex = parseInt(args[1]) - 1
    let theirIndex = parseInt(args[2]) - 1

    if (isNaN(myIndex) || !user.pokemones[myIndex]) return conn.reply(m.chat, `❌ Número de tu pokemon inválido`, m)

    let targetUser = global.db.data.users[target]
    if (!targetUser?.pokemones?.[theirIndex]) return conn.reply(m.chat, `❌ El rival no tiene ese pokemon`, m)

    let myPokemon = user.pokemones[myIndex]
    let theirPokemon = targetUser.pokemones[theirIndex]

    let myPower = myPokemon.ataque + myPokemon.defensa + myPokemon.hp + Math.floor(Math.random() * 50)
    let theirPower = theirPokemon.ataque + theirPokemon.defensa + theirPokemon.hp + Math.floor(Math.random() * 50)

    let ganador, perdedor, ganadorUser, ganadorPokemon, perdedorPokemon

    if (myPower > theirPower) {
      ganador = m.sender
      perdedor = target
      ganadorUser = user
      ganadorPokemon = myPokemon
      perdedorPokemon = theirPokemon
    } else {
      ganador = target
      perdedor = m.sender
      ganadorUser = targetUser
      ganadorPokemon = theirPokemon
      perdedorPokemon = myPokemon
    }

    let premio = Math.floor((perdedorPokemon.ataque + perdedorPokemon.defensa + perdedorPokemon.hp) * 2)
    ganadorUser.coin += premio

    let texto = `
⚔️ *POKEMON PELEA* ⚔️

🔴 *${myPokemon.nombre}* (${conn.getName(m.sender)})
   ❤️ ${myPokemon.hp} | ⚔️ ${myPokemon.ataque} | 🛡️ ${myPokemon.defensa}
   💪 Poder: ${myPower}

🆚

🔵 *${theirPokemon.nombre}* (@${target.split('@')[0]})
   ❤️ ${theirPokemon.hp} | ⚔️ ${theirPokemon.ataque} | 🛡️ ${theirPokemon.defensa}
   💪 Poder: ${theirPower}

🏆 *¡Ganó ${ganadorPokemon.nombre}!*
👑 *Ganador:* @${ganador.split('@')[0]}
💸 *Premio:* ${premio} ${global.moneda}
`.trim()

    conn.reply(m.chat, texto, m, { mentionedJid: [ganador, perdedor] })
    return
  }
}

handler.help = ['donarpokemon', 'venderpokemon', 'pokemonpelea']
handler.tags = ['pokemon']
handler.command = ['donarpokemon', 'regalarpokemon', 'venderpokemon', 'pokemonpelea', 'pkpelea']
handler.reg = true
handler.group = true

export default handler