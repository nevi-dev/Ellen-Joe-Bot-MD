import fetch from 'node-fetch'

// Memorias temporales para el bot
let cooldowns = {}
let pokemonActivo = {}
let intercambios = {} // Guarda las ofertas de tradeo pendientes

let handler = async (m, { conn, args, usedPrefix, command }) => {
  let user = global.db.data.users[m.sender]
  
  // Inicialización de la cuenta del jugador
  if (!user.pokemones) user.pokemones = []
  if (typeof user.pokeballs === 'undefined') user.pokeballs = 5 // Regalo inicial
  if (typeof user.coin === 'undefined') user.coin = 200 // Monedas iniciales

  // ==========================================
  // 1. ELEGIR INICIAL
  // ==========================================
  if (command === 'pkstart') {
    if (user.pokemones.length > 0) return m.reply('❌ ¡Ya eres un entrenador! Tu viaje ya comenzó.')
    let eleccion = parseInt(args[0])
    const ids = [1, 4, 7] // Bulbasaur, Charmander, Squirtle
    
    if (!eleccion || eleccion < 1 || eleccion > 3) {
      let txt = `╭━━━━━━「 🎓 **LABORATORIO OAK** 」━━━━━\n`
      txt += `┃ Elige a tu primer compañero:\n`
      txt += `┃ 1️⃣ Bulbasaur 🍃\n`
      txt += `┃ 2️⃣ Charmander 🔥\n`
      txt += `┃ 3️⃣ Squirtle 💧\n`
      txt += `┃\n┃ Usa: *${usedPrefix}pkstart [1, 2 o 3]*\n`
      txt += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      return m.reply(txt)
    }
    
    await m.reply('⏳ *Conectando con la Pokédex...*')
    let data = await getPokeData(ids[eleccion - 1])
    user.pokemones.push(data)
    return conn.sendFile(m.chat, data.imagen, 'p.png', `✨ ¡Felicidades! Has recibido a **${data.nombre}** (Nvl 1).`, m)
  }

  // ==========================================
  // 2. BUSCAR Y ATRAPAR
  // ==========================================
  if (command === 'pokemon') {
    let tiempoEspera = 3 * 60 // 3 minutos
    if (cooldowns[m.sender] && Date.now() - cooldowns[m.sender] < tiempoEspera * 1000) {
      let left = Math.ceil((cooldowns[m.sender] + tiempoEspera * 1000 - Date.now()) / 1000)
      return m.reply(`⏳ Aún no hay Pokémon cerca. Busca de nuevo en *${Math.floor(left / 60)}m ${left % 60}s*.`)
    }

    cooldowns[m.sender] = Date.now()
    let id = Math.floor(Math.random() * 898) + 1
    let data = await getPokeData(id)
    pokemonActivo[m.chat] = data
    
    let txt = `🌿 *¡UN POKÉMON SALVAJE APARECIÓ!* 🌿\n\n`
    txt += `🔸 **${data.nombre}**\n`
    txt += `🔸 Tipo: ${data.tipos}\n\n`
    txt += `Usa *${usedPrefix}atrapar* para lanzar una Pokébola 🔴.`
    return conn.sendFile(m.chat, data.imagen, 'p.png', txt, m)
  }

  if (command === 'atrapar') {
    if (!pokemonActivo[m.chat]) return m.reply('❌ No hay ningún Pokémon salvaje aquí.')
    if (user.pokeballs <= 0) return m.reply(`❌ No tienes Pokébolas 🔴. Cómpralas en la *${usedPrefix}pktienda*.`)
    
    user.pokeballs -= 1
    let p = pokemonActivo[m.chat]
    delete pokemonActivo[m.chat]
    
    if (Math.random() > 0.4) { // 60% de probabilidad de captura
      user.pokemones.push(p)
      return m.reply(`🎯 ¡Gotcha! **${p.nombre}** fue atrapado. (Te quedan ${user.pokeballs} 🔴)`)
    } else {
      return m.reply(`💨 Oh no... **${p.nombre}** rompió la Pokébola y escapó.`)
    }
  }

  // ==========================================
  // 3. TIENDA (COMPRAR ITEMS Y POKÉMON)
  // ==========================================
  if (command === 'pktienda' || command === 'pkshop') {
    let accion = args[0]?.toLowerCase()
    
    if (accion === 'pokebola') {
      let cant = parseInt(args[1]) || 1
      let precio = 50 * cant
      if (user.coin < precio) return m.reply(`❌ Necesitas ${precio} coins para comprar ${cant} Pokébolas.`)
      user.coin -= precio
      user.pokeballs += cant
      return m.reply(`🛒 Compraste *${cant} Pokébolas 🔴* por ${precio} coins.`)
    }
    
    if (accion === 'huevo') {
      let precio = 500
      if (user.coin < precio) return m.reply(`❌ Un Huevo Misterioso cuesta ${precio} coins. No te alcanza.`)
      user.coin -= precio
      await m.reply('🥚 *El huevo se está abriendo...*')
      let id = Math.floor(Math.random() * 898) + 1
      let data = await getPokeData(id)
      user.pokemones.push(data)
      return conn.sendFile(m.chat, data.imagen, 'huevo.png', `✨ ¡Felicidades! Del huevo nació un **${data.nombre}** salvaje.`, m)
    }

    let menuTienda = `🏪 *TIENDA POKÉMON* 🏪\n\n`
    menuTienda += `Tu saldo: 💰 ${user.coin} coins\n\n`
    menuTienda += `🔴 *Pokébola* - 50 coins\n`
    menuTienda += `🥚 *Huevo Misterioso* (Pokémon Aleatorio) - 500 coins\n\n`
    menuTienda += `*Uso:* \n${usedPrefix}pktienda pokebola [cantidad]\n${usedPrefix}pktienda huevo`
    return m.reply(menuTienda)
  }

  // ==========================================
  // 4. VENDER POKÉMON AL BOT
  // ==========================================
  if (command === 'pkvender') {
    let idx = parseInt(args[0]) - 1
    if (isNaN(idx) || !user.pokemones[idx]) return m.reply(`❌ Selecciona un Pokémon válido: *${usedPrefix}pkvender [ID]*`)
    if (user.pokemones.length === 1) return m.reply('❌ No puedes vender tu último Pokémon.')

    let p = user.pokemones[idx]
    // El precio se calcula en base a sus stats y su nivel
    let precio = Math.floor((p.ataque + p.defensa + p.hp) * 0.5) + (p.nivel * 50)
    
    user.pokemones.splice(idx, 1) // Elimina el pokemon
    user.coin += precio
    
    return m.reply(`🤝 Has vendido a **${p.nombre}** (Nvl ${p.nivel}) al Profesor Oak.\nRecibiste 💰 *${precio} coins*.`)
  }

  // ==========================================
  // 5. TRADEO (INTERCAMBIO ENTRE JUGADORES)
  // ==========================================
  if (command === 'pktradeo') {
    let target = m.quoted ? m.quoted.sender : null
    if (!target) return m.reply('❌ Responde al mensaje del jugador con el que quieres intercambiar.')
    if (target === m.sender) return m.reply('❌ No puedes intercambiar contigo mismo.')
    
    let miId = parseInt(args[0]) - 1
    let suId = parseInt(args[1]) - 1
    let targetUser = global.db.data.users[target]

    if (isNaN(miId) || isNaN(suId)) return m.reply(`❌ Uso correcto: *${usedPrefix}pktradeo [Mi_Pokémon_ID] [Su_Pokémon_ID]*`)
    if (!user.pokemones[miId]) return m.reply('❌ No tienes ese Pokémon.')
    if (!targetUser?.pokemones?.[suId]) return m.reply('❌ El otro jugador no tiene ese Pokémon.')

    let miPk = user.pokemones[miId]
    let suPk = targetUser.pokemones[suId]

    // Guardar la oferta
    intercambios[target] = {
      emisor: m.sender,
      idEmisor: miId,
      idReceptor: suId,
      pokeEmisor: miPk,
      pokeReceptor: suPk
    }

    let txt = `🔄 **¡SOLICITUD DE INTERCAMBIO!** 🔄\n\n`
    txt += `@${m.sender.split('@')[0]} ofrece a su **${miPk.nombre}** (Nvl ${miPk.nivel})\n`
    txt += `A cambio de tu **${suPk.nombre}** (Nvl ${suPk.nivel}).\n\n`
    txt += `Si aceptas, responde a este mensaje con: *${usedPrefix}pkaceptar*`
    return conn.reply(m.chat, txt, m, { mentionedJid: [m.sender, target] })
  }

  if (command === 'pkaceptar') {
    let oferta = intercambios[m.sender]
    if (!oferta) return m.reply('❌ No tienes ninguna oferta de intercambio pendiente.')
    
    let emisorData = global.db.data.users[oferta.emisor]
    
    // Intercambiar (quitar y añadir)
    let pokeMio = user.pokemones.splice(oferta.idReceptor, 1)[0]
    let pokeSuyo = emisorData.pokemones.splice(oferta.idEmisor, 1)[0]
    
    user.pokemones.push(pokeSuyo)
    emisorData.pokemones.push(pokeMio)
    
    delete intercambios[m.sender] // Limpiar oferta
    return m.reply(`✅ **¡INTERCAMBIO EXITOSO!** 🎉\n\nHas recibido a **${pokeSuyo.nombre}** y entregaste a **${pokeMio.nombre}**.`)
  }

  // ==========================================
  // 6. VER EQUIPO Y ESTADÍSTICAS
  // ==========================================
  if (command === 'mispokemon') {
    if (user.pokemones.length === 0) return m.reply('🎒 Tu mochila está vacía.')
    let txt = `🎒 **MOCHILA DE ${conn.getName(m.sender)}**\n`
    txt += `💰 Coins: ${user.coin} | 🔴 Pokébolas: ${user.pokeballs}\n\n`
    user.pokemones.forEach((p, i) => {
      txt += `*[ ${i + 1} ]* ${p.nombre} 🌟 Lvl: ${p.nivel}\n`
    })
    txt += `\nUsa *${usedPrefix}pkstats [ID]* para ver los detalles.`
    return m.reply(txt)
  }

  if (command === 'pkstats') {
    let idx = parseInt(args[0]) - 1
    if (isNaN(idx) || !user.pokemones[idx]) return m.reply('❌ Indica el número de tu Pokémon en la mochila.')
    let p = user.pokemones[idx]
    
    let txt = `📊 *ESTADÍSTICAS DE POKÉMON* 📊\n\n`
    txt += `*Nombre:* ${p.nombre}\n`
    txt += `*Nivel:* ${p.nivel} (XP: ${p.xp}/100)\n`
    txt += `*Tipos:* ${p.tipos}\n\n`
    txt += `❤️ *HP:* ${p.hp}\n`
    txt += `⚔️ *Ataque:* ${p.ataque}\n`
    txt += `🛡️ *Defensa:* ${p.defensa}\n`
    txt += `⚡ *Velocidad:* ${p.velocidad}\n`
    
    return conn.sendFile(m.chat, p.imagen, 'stats.png', txt, m)
  }

  // ==========================================
  // 7. INCURSIONES Y PELEAS
  // ==========================================
  if (command === 'raid' || command === 'pkincursion') {
    let idx = parseInt(args[0]) - 1
    if (isNaN(idx) || !user.pokemones[idx]) return m.reply(`❌ Elige a quién enviar: *${usedPrefix}raid [ID]*`)
    
    let p = user.pokemones[idx]
    let exp = Math.floor(Math.random() * 40) + 20
    let oro = Math.floor(Math.random() * 80) + 20
    
    p.xp += exp
    user.coin += oro
    
    let msg = `🌋 **${p.nombre}** volvió de la incursión.\n📈 Ganó +${exp} XP\n💰 Encontró +${oro} coins.`
    
    if (p.xp >= 100) {
      p.nivel += 1
      p.xp = 0
      p.hp += 5; p.ataque += 3; p.defensa += 3; p.velocidad += 2
      msg += `\n\n⭐ *¡TU POKÉMON SUBIÓ AL NIVEL ${p.nivel}! Sus estadísticas aumentaron.*`
    }
    return m.reply(msg)
  }

  if (command === 'pkpelea') {
    let target = m.quoted ? m.quoted.sender : null
    if (!target) return m.reply('❌ Responde al mensaje del jugador al que quieres retar.')
    
    let miId = parseInt(args[0]) - 1
    let suId = parseInt(args[1]) - 1
    let targetUser = global.db.data.users[target]

    if (!user.pokemones[miId] || !targetUser?.pokemones?.[suId]) return m.reply('❌ Selección de Pokémon inválida o el usuario no juega.')

    let p1 = user.pokemones[miId]
    let p2 = targetUser.pokemones[suId]

    // El poder total incluye Nivel y Stats
    let power1 = p1.ataque + p1.defensa + p1.velocidad + (p1.nivel * 10) + Math.random() * 30
    let power2 = p2.ataque + p2.defensa + p2.velocidad + (p2.nivel * 10) + Math.random() * 30

    let ganoYo = power1 > power2
    let premio = 150

    let txt = `⚔️ *BATALLA POKÉMON* ⚔️\n\n`
    txt += `🔴 **${p1.nombre}** (Nvl ${p1.nivel}) VS 🔵 **${p2.nombre}** (Nvl ${p2.nivel})\n\n`
    
    if (ganoYo) {
      user.coin += premio
      txt += `🏆 *¡HAS GANADO!* Recibes 💰 ${premio} coins.`
    } else {
      targetUser.coin += premio
      txt += `💀 *HAS PERDIDO.* @${target.split('@')[0]} recibe 💰 ${premio} coins.`
    }
    return conn.reply(m.chat, txt, m, { mentionedJid: [target] })
  }

  // ==========================================
  // 8. MENÚ DE AYUDA
  // ==========================================
  if (command === 'pkhelp') {
    let h = `✨ **GUÍA MAESTRO POKÉMON** ✨\n\n`
    h += `*--- BÁSICOS ---*\n`
    h += `🎓 *${usedPrefix}pkstart* - Elige tu inicial\n`
    h += `🌿 *${usedPrefix}pokemon* - Busca salvajes\n`
    h += `🔴 *${usedPrefix}atrapar* - Lanza una Pokébola\n`
    h += `🎒 *${usedPrefix}mispokemon* - Mira tu equipo\n`
    h += `📊 *${usedPrefix}pkstats [ID]* - Ver stats detallados\n\n`
    h += `*--- ECONOMÍA Y COMERCIO ---*\n`
    h += `🏪 *${usedPrefix}pktienda* - Compra Pokébolas o Huevos\n`
    h += `💸 *${usedPrefix}pkvender [ID]* - Vende por Coins\n`
    h += `🔄 *${usedPrefix}pktradeo [MiID] [SuID]* - Intercambia (responde a su msg)\n\n`
    h += `*--- COMBATE Y SUBIDA ---*\n`
    h += `🌋 *${usedPrefix}raid [ID]* - Farmea XP y monedas\n`
    h += `⚔️ *${usedPrefix}pkpelea [MiID] [SuID]* - Duelo PvP (responde a su msg)\n`
    return m.reply(h)
  }
}

// ==========================================
// FUNCIÓN AUXILIAR (Extrae datos de la PokeAPI)
// ==========================================
async function getPokeData(id) {
  let res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
  let data = await res.json()
  return {
    nombre: data.name.toUpperCase(),
    id: data.id,
    tipos: data.types.map(t => t.type.name.toUpperCase()).join(', '),
    hp: data.stats[0].base_stat,
    ataque: data.stats[1].base_stat,
    defensa: data.stats[2].base_stat,
    velocidad: data.stats[5].base_stat,
    imagen: data.sprites.other['official-artwork'].front_default,
    nivel: 1,
    xp: 0
  }
}

handler.command = ['pkstart', 'pokemon', 'atrapar', 'pktienda', 'pkshop', 'pkvender', 'pktradeo', 'pkaceptar', 'pkstats', 'mispokemon', 'pkincursion', 'raid', 'pkpelea', 'pkhelp']
handler.group = true
export default handler
