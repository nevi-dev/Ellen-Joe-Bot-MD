import fetch from 'node-fetch'

// Memoria temporal para encuentros y tradeos en el chat actual
let pokemonActivo = {}
let intercambios = {}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  let user = global.db.data.users[m.sender]
  
  // ==========================================
  // INICIALIZACIÓN SEGURA DE DATOS DEL JUGADOR
  // ==========================================
  if (!user.pokemones) user.pokemones = []
  if (typeof user.pkStarted === 'undefined') user.pkStarted = false
  if (typeof user.pkCooldown === 'undefined') user.pkCooldown = 0
  if (typeof user.coin === 'undefined') user.coin = 500
  
  // Migración para usuarios antiguos que tenían las pokebolas como un solo número
  if (typeof user.pokeballs === 'number' || !user.pokeballs) {
    user.pokeballs = { normal: 5, super: 0, ultra: 0, master: 0 }
  }

  // ==========================================
  // 1. ELEGIR INICIAL (CON BLOQUEO ANTI-BUG)
  // ==========================================
  if (command === 'pkstart') {
    if (user.pkStarted) return m.reply('❌ El Profesor Oak ya te entregó un Pokémon. ¡Tu viaje ya comenzó!')
    
    let eleccion = parseInt(args[0])
    const ids = [1, 4, 7] // Bulbasaur, Charmander, Squirtle
    
    if (!eleccion || eleccion < 1 || eleccion > 3) {
      let txt = `╭━━━━━━「 🎓 **LABORATORIO OAK** 」━━━━━\n`
      txt += `┃ ¡Hola! Soy el Profesor Oak. \n`
      txt += `┃ Elige sabiamente a tu compañero:\n`
      txt += `┃ \n`
      txt += `┃ 1️⃣ Bulbasaur 🍃 (Planta/Veneno)\n`
      txt += `┃ 2️⃣ Charmander 🔥 (Fuego)\n`
      txt += `┃ 3️⃣ Squirtle 💧 (Agua)\n`
      txt += `┃\n┃ Usa: *${usedPrefix}pkstart [1, 2 o 3]*\n`
      txt += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      return m.reply(txt)
    }
    
    await m.reply('⏳ *El Profesor Oak está preparando la Pokébola...*')
    try {
      let data = await getPokeData(ids[eleccion - 1])
      user.pokemones.push(data)
      user.pkStarted = true // BLOQUEO PERMANENTE
      return conn.sendFile(m.chat, data.imagen, 'p.png', `✨ ¡Felicidades! Has recibido a **${data.nombre}** (Nvl 1).`, m)
    } catch (e) {
      return m.reply('❌ Error de conexión con la Pokédex. Intenta de nuevo.')
    }
  }

  // ==========================================
  // 2. BUSCAR POKÉMON (COOLDOWN EN BASE DE DATOS)
  // ==========================================
  if (command === 'pokemon') {
    if (!user.pkStarted) return m.reply(`❌ Debes elegir tu inicial primero con *${usedPrefix}pkstart*`)

    let tiempoEspera = 3 * 60 * 1000 // 3 minutos en milisegundos
    if (Date.now() - user.pkCooldown < tiempoEspera) {
      let left = Math.ceil((user.pkCooldown + tiempoEspera - Date.now()) / 1000)
      return m.reply(`⏳ El pasto está muy alto... busca de nuevo en *${Math.floor(left / 60)}m ${left % 60}s*.`)
    }

    user.pkCooldown = Date.now()
    
    try {
      let id = Math.floor(Math.random() * 898) + 1
      let data = await getPokeData(id)
      pokemonActivo[m.chat] = data
      
      let txt = `🌿 *¡UN POKÉMON SALVAJE APARECIÓ!* 🌿\n\n`
      txt += `🔸 **${data.nombre}** (Tipo: ${data.tipos})\n\n`
      txt += `Usa *${usedPrefix}atrapar [bola]* para capturarlo.\n`
      txt += `_Ej: ${usedPrefix}atrapar normal, super, ultra o master_`
      return conn.sendFile(m.chat, data.imagen, 'p.png', txt, m)
    } catch (e) {
      user.pkCooldown = 0 // Si falla, resetea el tiempo
      return m.reply('❌ El Pokémon huyó muy rápido. Intenta de nuevo.')
    }
  }

  // ==========================================
  // 3. ATRAPAR (SISTEMA DE POKÉBOLAS)
  // ==========================================
  if (command === 'atrapar') {
    if (!pokemonActivo[m.chat]) return m.reply('❌ No hay ningún Pokémon salvaje aquí.')
    
    let tipoBola = (args[0] || 'normal').toLowerCase()
    let bolasDisponibles = ['normal', 'super', 'ultra', 'master']
    
    if (!bolasDisponibles.includes(tipoBola)) return m.reply(`❌ Tipo de bola inválido. Usa: normal, super, ultra o master.`)
    if (user.pokeballs[tipoBola] <= 0) return m.reply(`❌ No tienes *${tipoBola.toUpperCase()}BALLS*. Cómpralas en la *${usedPrefix}pktienda*.`)
    
    // Gastar la bola
    user.pokeballs[tipoBola] -= 1
    let p = pokemonActivo[m.chat]
    
    // Probabilidades de captura
    let chance = Math.random()
    let ratioCaptura = 0
    if (tipoBola === 'normal') ratioCaptura = 0.40 // 40%
    if (tipoBola === 'super') ratioCaptura = 0.65  // 65%
    if (tipoBola === 'ultra') ratioCaptura = 0.85  // 85%
    if (tipoBola === 'master') ratioCaptura = 1.00 // 100%

    delete pokemonActivo[m.chat] // El pokemon desaparece ganes o pierdas

    if (chance <= ratioCaptura) {
      user.pokemones.push(p)
      return m.reply(`🎯 ¡1... 2... 3... Gotcha! \n**${p.nombre}** fue atrapado con éxito usando una *${tipoBola.toUpperCase()}BALL*.`)
    } else {
      return m.reply(`💨 ¡Oh no! **${p.nombre}** rompió la *${tipoBola.toUpperCase()}BALL* y escapó.`)
    }
  }

  // ==========================================
  // 4. TIENDA (NUEVOS OBJETOS)
  // ==========================================
  if (command === 'pktienda' || command === 'pkshop') {
    let accion = args[0]?.toLowerCase()
    let cant = parseInt(args[1]) || 1
    
    const precios = { normal: 50, super: 150, ultra: 400, master: 5000 }

    if (precios[accion]) {
      let costeTotal = precios[accion] * cant
      if (user.coin < costeTotal) return m.reply(`❌ Necesitas 💰 ${costeTotal} coins para comprar ${cant} ${accion.toUpperCase()}BALLS.`)
      
      user.coin -= costeTotal
      user.pokeballs[accion] += cant
      return m.reply(`🛒 Has comprado *${cant} ${accion.toUpperCase()}BALL(s)* por 💰 ${costeTotal} coins.`)
    }

    if (accion === 'huevo') {
      let precioHuevo = 1000
      if (user.coin < precioHuevo) return m.reply(`❌ Un Huevo Misterioso cuesta 💰 ${precioHuevo} coins.`)
      user.coin -= precioHuevo
      await m.reply('🥚 *El huevo se está abriendo...*')
      try {
        let id = Math.floor(Math.random() * 898) + 1
        let data = await getPokeData(id)
        user.pokemones.push(data)
        return conn.sendFile(m.chat, data.imagen, 'huevo.png', `✨ ¡Felicidades! Del huevo nació un **${data.nombre}** salvaje.`, m)
      } catch (e) {
        user.coin += precioHuevo // Reembolso si hay error de red
        return m.reply('❌ El huevo era falso (Error de API). Se te han devuelto tus monedas.')
      }
    }

    let menuTienda = `🏪 *CENTRO COMERCIAL DE AZULONA* 🏪\n\n`
    menuTienda += `Tu saldo: 💰 ${user.coin} coins\n\n`
    menuTienda += `🔴 *Normal* (40% de captura) - 50 coins\n`
    menuTienda += `🔵 *Super* (65% de captura) - 150 coins\n`
    menuTienda += `🟡 *Ultra* (85% de captura) - 400 coins\n`
    menuTienda += `🟣 *Master* (100% captura) - 5000 coins\n`
    menuTienda += `🥚 *Huevo* (Pokémon Random) - 1000 coins\n\n`
    menuTienda += `*Ejemplo de compra:*\n${usedPrefix}pktienda super 5\n${usedPrefix}pktienda huevo`
    return m.reply(menuTienda)
  }

  // ==========================================
  // 5. MOCHILA Y ESTADÍSTICAS
  // ==========================================
  if (command === 'mispokemon') {
    if (user.pokemones.length === 0) return m.reply('🎒 Tu mochila está vacía.')
    let txt = `🎒 **INVENTARIO DE ${conn.getName(m.sender)}**\n`
    txt += `💰 Coins: ${user.coin}\n`
    txt += `🎒 Bolas: 🔴 ${user.pokeballs.normal} | 🔵 ${user.pokeballs.super} | 🟡 ${user.pokeballs.ultra} | 🟣 ${user.pokeballs.master}\n\n`
    
    user.pokemones.forEach((p, i) => {
      txt += `*[ ${i + 1} ]* ${p.nombre} 🌟 Lvl: ${p.nivel}\n`
    })
    txt += `\nUsa *${usedPrefix}pkstats [ID]* para ver los stats de uno.`
    return m.reply(txt)
  }

  if (command === 'pkstats') {
    let idx = parseInt(args[0]) - 1
    if (isNaN(idx) || !user.pokemones[idx]) return m.reply('❌ Indica el número de tu Pokémon en la mochila.')
    let p = user.pokemones[idx]
    
    let txt = `📊 *FICHA TÉCNICA* 📊\n\n`
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
  // 6. TRADEO ENTRE JUGADORES
  // ==========================================
  if (command === 'pktradeo') {
    let target = m.quoted ? m.quoted.sender : null
    if (!target) return m.reply('❌ Responde al mensaje del jugador con el que quieres intercambiar.')
    if (target === m.sender) return m.reply('❌ No puedes intercambiar contigo mismo.')
    
    let miId = parseInt(args[0]) - 1
    let suId = parseInt(args[1]) - 1
    let targetUser = global.db.data.users[target]

    if (isNaN(miId) || isNaN(suId)) return m.reply(`❌ Uso correcto: *${usedPrefix}pktradeo [Mi_ID] [Su_ID]*`)
    if (!user.pokemones[miId]) return m.reply('❌ No tienes ese Pokémon.')
    if (!targetUser?.pokemones?.[suId]) return m.reply('❌ El otro jugador no tiene ese Pokémon.')

    intercambios[target] = { emisor: m.sender, idEmisor: miId, idReceptor: suId }

    let txt = `🔄 **¡SOLICITUD DE INTERCAMBIO GTC!** 🔄\n\n`
    txt += `@${m.sender.split('@')[0]} ofrece a **${user.pokemones[miId].nombre}**\n`
    txt += `A cambio de tu **${targetUser.pokemones[suId].nombre}**.\n\n`
    txt += `Si aceptas, responde a este mensaje con: *${usedPrefix}pkaceptar*`
    return conn.reply(m.chat, txt, m, { mentionedJid: [m.sender, target] })
  }

  if (command === 'pkaceptar') {
    let oferta = intercambios[m.sender]
    if (!oferta) return m.reply('❌ No tienes ninguna oferta de intercambio pendiente.')
    
    let emisorData = global.db.data.users[oferta.emisor]
    
    let pokeMio = user.pokemones.splice(oferta.idReceptor, 1)[0]
    let pokeSuyo = emisorData.pokemones.splice(oferta.idEmisor, 1)[0]
    
    user.pokemones.push(pokeSuyo)
    emisorData.pokemones.push(pokeMio)
    delete intercambios[m.sender]
    
    return m.reply(`✅ **¡INTERCAMBIO EXITOSO!** 🎉\n\nHas recibido a **${pokeSuyo.nombre}** y entregaste a **${pokeMio.nombre}**.`)
  }

  // ==========================================
  // 7. VENDER POKÉMON
  // ==========================================
  if (command === 'pkvender') {
    let idx = parseInt(args[0]) - 1
    if (isNaN(idx) || !user.pokemones[idx]) return m.reply(`❌ Selecciona un Pokémon: *${usedPrefix}pkvender [ID]*`)
    if (user.pokemones.length === 1) return m.reply('❌ ¡El Profesor Oak dice que no puedes vender a tu único Pokémon!')

    let p = user.pokemones[idx]
    let precio = Math.floor((p.ataque + p.defensa + p.hp) * 0.5) + (p.nivel * 50)
    
    user.pokemones.splice(idx, 1)
    user.coin += precio
    return m.reply(`🤝 Has transferido a **${p.nombre}** al Profesor Oak.\nRecibiste 💰 *${precio} coins*.`)
  }

  // ==========================================
  // 8. COMBATES Y RAIDS
  // ==========================================
  if (command === 'raid' || command === 'pkincursion') {
    let idx = parseInt(args[0]) - 1
    if (isNaN(idx) || !user.pokemones[idx]) return m.reply(`❌ Elige a quién enviar: *${usedPrefix}raid [ID]*`)
    
    let p = user.pokemones[idx]
    let exp = Math.floor(Math.random() * 40) + 20
    let oro = Math.floor(Math.random() * 100) + 30
    
    p.xp += exp
    user.coin += oro
    
    let msg = `🌋 **${p.nombre}** regresó victorioso de la incursión.\n📈 Ganó +${exp} XP\n💰 Encontró +${oro} coins.`
    
    if (p.xp >= 100) {
      p.nivel += 1
      p.xp = p.xp - 100 // Guarda el sobrante de XP
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

    if (!user.pokemones[miId] || !targetUser?.pokemones?.[suId]) return m.reply('❌ Selección de Pokémon inválida o el usuario no está registrado.')

    let p1 = user.pokemones[miId]
    let p2 = targetUser.pokemones[suId]

    let power1 = p1.ataque + p1.defensa + p1.velocidad + (p1.nivel * 12) + Math.random() * 30
    let power2 = p2.ataque + p2.defensa + p2.velocidad + (p2.nivel * 12) + Math.random() * 30

    let ganoYo = power1 > power2
    let premio = 200

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
  // 9. AYUDA
  // ==========================================
  if (command === 'pkhelp') {
    let h = `✨ **GUÍA MAESTRO POKÉMON** ✨\n\n`
    h += `*--- BÁSICOS ---*\n`
    h += `🎓 *${usedPrefix}pkstart* - Elige tu inicial\n`
    h += `🌿 *${usedPrefix}pokemon* - Busca salvajes\n`
    h += `🔴 *${usedPrefix}atrapar [bola]* - Ej: .atrapar ultra\n`
    h += `🎒 *${usedPrefix}mispokemon* - Mira tu equipo\n`
    h += `📊 *${usedPrefix}pkstats [ID]* - Ver ficha técnica\n\n`
    h += `*--- TIENDA Y COMERCIO ---*\n`
    h += `🏪 *${usedPrefix}pktienda* - Ver catálogo de Pokébolas\n`
    h += `💸 *${usedPrefix}pkvender [ID]* - Vende por Coins\n`
    h += `🔄 *${usedPrefix}pktradeo [Mi_ID] [Su_ID]* - Intercambia\n\n`
    h += `*--- COMBATE Y SUBIDA ---*\n`
    h += `🌋 *${usedPrefix}raid [ID]* - Sube de nivel tu Pokémon\n`
    h += `⚔️ *${usedPrefix}pkpelea [Mi_ID] [Su_ID]* - Retar a duelo\n`
    return m.reply(h)
  }
}

// ==========================================
// FUNCIÓN PARA OBTENER DATOS DE LA POKEAPI
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
