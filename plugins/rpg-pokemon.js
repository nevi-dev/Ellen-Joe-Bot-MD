import fetch from 'node-fetch'

let cooldowns = {}
let pokemonActivo = {}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  let user = global.db.data.users[m.sender]
  
  // Inicialización de variables de usuario
  if (!user.pokemones) user.pokemones = []
  if (!user.pokeballs) user.pokeballs = 5 // Regalo inicial
  if (typeof user.coin === 'undefined') user.coin = 100
  
  // --- 1. ELECCIÓN DE INICIALES ---
  if (command === 'pkstart') {
    if (user.pokemones.length > 0) return m.reply('❌ Ya eres un entrenador. ¡Tu viaje ya comenzó!')
    let eleccion = parseInt(args[0])
    const ids = [1, 4, 7]
    if (!eleccion || eleccion < 1 || eleccion > 3) {
      return m.reply(`🎓 *PROFESOR OAK*: Elige a tu compañero:\n\n1. Bulbasaur 🍃\n2. Charmander 🔥\n3. Squirtle 💧\n\nUsa: *${usedPrefix}pkstart [1, 2 o 3]*`)
    }
    let res = await fetch(`https://pokeapi.co/api/v2/pokemon/${ids[eleccion - 1]}`)
    let data = await res.json()
    let poke = crearObjetoPokemon(data)
    user.pokemones.push(poke)
    return conn.sendFile(m.chat, poke.imagen, 'p.png', `✨ ¡Has recibido a **${poke.nombre}**! Es nivel 1.`, m)
  }

  // --- 2. TIENDA DE POKÉBOLAS ---
  if (command === 'pktienda' || command === 'pkshop') {
    let precio = 50
    let cantidad = parseInt(args[0]) || 1
    let costeTotal = precio * cantidad
    if (args[0] === 'comprar') {
      if (user.coin < costeTotal) return m.reply(`❌ No tienes suficientes coins (${costeTotal} necesarias).`)
      user.coin -= costeTotal
      user.pokeballs += cantidad
      return m.reply(`🛒 Compraste *${cantidad} Pokébolas* por ${costeTotal} coins.`)
    }
    return m.reply(`🏪 *TIENDA POKÉMON*\n\n🔴 **Pokébola**: ${precio} coins\n\nUsa: *${usedPrefix}pktienda comprar [cantidad]*`)
  }

  // --- 3. APARECER Y ATRAPAR ---
  if (command === 'pokemon') {
    let id = Math.floor(Math.random() * 898) + 1
    let res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
    let data = await res.json()
    pokemonActivo[m.chat] = crearObjetoPokemon(data)
    let txt = `🌿 *POKÉMON SALVAJE* 🌿\n\n**${pokemonActivo[m.chat].nombre}**\nUsa: *${usedPrefix}atrapar*`
    return conn.sendFile(m.chat, pokemonActivo[m.chat].imagen, 'p.png', txt, m)
  }

  if (command === 'atrapar') {
    if (!pokemonActivo[m.chat]) return m.reply('❌ No hay nada que atrapar.')
    if (user.pokeballs <= 0) return m.reply('❌ ¡No tienes Pokébolas! Compra en la tienda.')
    
    user.pokeballs -= 1
    let p = pokemonActivo[m.chat]
    delete pokemonActivo[m.chat]
    
    if (Math.random() > 0.4) {
      user.pokemones.push(p)
      return m.reply(`🎯 ¡Atrapado! **${p.nombre}** se añadió a tu equipo. (Te quedan ${user.pokeballs} 🔴)`)
    } else {
      return m.reply(`💨 **${p.nombre}** se escapó...`)
    }
  }

  // --- 4. INCURSIONES (SUBIR DE NIVEL) ---
  if (command === 'pkincursion' || command === 'raid') {
    let idx = parseInt(args[0]) - 1
    if (isNaN(idx) || !user.pokemones[idx]) return m.reply(`❌ Elige qué Pokémon enviar: *${usedPrefix}raid [id]*`)
    
    let pk = user.pokemones[idx]
    let expGanada = Math.floor(Math.random() * 40) + 20
    let coinsGanadas = Math.floor(Math.random() * 100) + 50
    
    pk.xp += expGanada
    user.coin += coinsGanadas
    
    let levelUp = ""
    if (pk.xp >= pk.nivel * 100) {
      pk.nivel += 1
      pk.xp = 0
      pk.ataque += 5
      pk.hp += 10
      levelUp = `\n⭐ ¡SUBIÓ A NIVEL **${pk.nivel}**! (Stats aumentados)`
    }

    let txt = `🌋 *INCURSIÓN COMPLETADA* 🌋\n\n`
    txt += `🥊 **${pk.nombre}** ha vuelto de la batalla.\n`
    txt += `📈 EXP: +${expGanada}\n`
    txt += `💰 COINS: +${coinsGanadas}${levelUp}`
    return m.reply(txt)
  }

  // --- 5. PELEA POR RESPUESTA ---
  if (command === 'pkpelea') {
    let target = m.quoted ? m.quoted.sender : null
    if (!target) return m.reply('❌ Responde al mensaje del rival.')
    let myPk = user.pokemones[parseInt(args[0]) - 1]
    let targetUser = global.db.data.users[target]
    let opponentPk = targetUser?.pokemones?.[parseInt(args[1]) - 1]
    
    if (!myPk || !opponentPk) return m.reply('❌ Selección de Pokémon inválida.')

    let p1 = myPk.ataque + (myPk.nivel * 2) + Math.random() * 20
    let p2 = opponentPk.ataque + (opponentPk.nivel * 2) + Math.random() * 20

    let win = p1 > p2
    let prize = 200
    if (win) user.coin += prize
    else targetUser.coin += prize

    return m.reply(`⚔️ **BATALLA** ⚔️\n\n${myPk.nombre} (Lvl ${myPk.nivel}) vs ${opponentPk.nombre} (Lvl ${opponentPk.nivel})\n\n🏆 Ganador: ${win ? 'Tú' : '@' + target.split('@')[0]}`, null, { mentionedJid: [target] })
  }

  // --- 6. AYUDA ---
  if (command === 'pkhelp') {
    let h = `✨ **CENTRO POKÉMON** ✨\n\n`
    h += `• *${usedPrefix}pkstart* - Elige tu inicial.\n`
    h += `• *${usedPrefix}pokemon* - Buscar salvaje.\n`
    h += `• *${usedPrefix}atrapar* - Usa 1 🔴 Pokébola.\n`
    h += `• *${usedPrefix}pktienda* - Compra Pokébolas.\n`
    h += `• *${usedPrefix}raid [id]* - Gana XP y sube de nivel.\n`
    h += `• *${usedPrefix}mispokemon* - Ver equipo y niveles.\n`
    h += `• *${usedPrefix}pkpelea [id] [id]* - Duelo (responde a alguien).`
    return m.reply(h)
  }

  // --- 7. VER EQUIPO ---
  if (command === 'mispokemon') {
    if (user.pokemones.length === 0) return m.reply('🎒 Vacío.')
    let list = user.pokemones.map((p, i) => `[${i + 1}] **${p.nombre}** 🌟 Lvl: ${p.nivel} (XP: ${p.xp}/100)`).join('\n')
    return m.reply(`🎒 **MOCHILA DE ENTRENADOR**\nCoins: ${user.coin} | Pokébolas: ${user.pokeballs} 🔴\n\n${list}`)
  }
}

// Función auxiliar para crear el objeto Pokémon
function crearObjetoPokemon(data) {
  return {
    nombre: data.name.toUpperCase(),
    id: data.id,
    hp: data.stats[0].base_stat,
    ataque: data.stats[1].base_stat,
    defensa: data.stats[2].base_stat,
    imagen: data.sprites.other['official-artwork'].front_default,
    nivel: 1,
    xp: 0
  }
}

handler.command = ['pkstart', 'pokemon', 'atrapar', 'pktienda', 'pkshop', 'pkincursion', 'raid', 'pkpelea', 'pkhelp', 'mispokemon']
export default handler
