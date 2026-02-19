import fetch from 'node-fetch'

// Memoria volátil
let pokemonActivo = {}
let intercambios = {}
let raidActiva = {} // Para los jefes

let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
  let user = global.db.data.users[m.sender]
  const adminNumber = '18493873691' // Tu número

  // ==========================================
  // ⚙️ INICIALIZACIÓN INTEGRAL (ANTI-BUG)
  // ==========================================
  if (!user.pokemones) user.pokemones = []
  if (typeof user.pkStarted === 'undefined') user.pkStarted = false
  if (typeof user.coin === 'undefined') user.coin = 1000
  if (!user.pkMochila) user.pkMochila = { caramelos: 0, pociones: 5 }
  if (!user.pkCooldowns) user.pkCooldowns = { explorar: 0, raid: 0 }
  if (!user.pokeballs) user.pokeballs = { normal: 10, super: 5, ultra: 2, master: 0 }
  // Nuevas variables para huevos
  if (!user.pkHuevos) user.pkHuevos = 0
  if (!user.pkIncubadora) user.pkIncubadora = { activo: false, tiempoHatch: 0 }

  // ==========================================
  // 🚫 COMANDO RESET GLOBAL
  // ==========================================
  if (command === 'pkreset') {
    let senderNum = m.sender.split('@')[0]
    if (senderNum !== adminNumber && !isOwner) return m.reply('❌ Acceso denegado.')
    
    let users = global.db.data.users
    Object.keys(users).forEach(id => {
      users[id].pokemones = []
      users[id].pkStarted = false
      users[id].coin = 1000
      users[id].pkMochila = { caramelos: 0, pociones: 5 }
      users[id].pokeballs = { normal: 10, super: 5, ultra: 2, master: 0 }
      users[id].pkHuevos = 0
      users[id].pkIncubadora = { activo: false, tiempoHatch: 0 }
    })
    return m.reply('🧹 **APOCALIPSIS POKÉMON:** El mundo ha vuelto a nacer.')
  }

  // ==========================================
  // 🎓 INICIO: LABORATORIO OAK
  // ==========================================
  if (command === 'pkstart') {
    if (user.pkStarted) return m.reply('❌ Ya tienes un compañero Pokémon.')
    let choice = parseInt(args[0])
    if (![1, 2, 3].includes(choice)) {
      let texto = `╭━━━━「 🎓 PROFESOR OAK 」━━━━\n`
      texto += `┃ ¡Hola! Bienvenido al mundo Pokémon.\n┃ Elige a tu primer compañero:\n┃\n`
      texto += `┃ 1️⃣ Bulbasaur 🍃\n┃ 2️⃣ Charmander 🔥\n┃ 3️⃣ Squirtle 💧\n┃\n`
      texto += `┃ Uso: *${usedPrefix}pkstart [1-3]*\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━`
      return m.reply(texto)
    }
    
    let ids = [1, 4, 7]
    let data = await getPokeData(ids[choice - 1])
    user.pokemones.push(data)
    user.pkStarted = true
    return conn.sendFile(m.chat, data.imagen, 'p.png', `✨ ¡Felicidades! Has recibido a **${data.nombre}**.`, m)
  }

  if (!user.pkStarted) return m.reply(`❌ Primero debes hablar con Oak usando *${usedPrefix}pkstart*`)

  // ==========================================
  // 🗺️ EXPLORACIÓN (NUEVO)
  // ==========================================
  if (command === 'pkexplorar') {
    let tiempoEspera = 5 * 60 * 1000 // 5 minutos
    if (new Date() - user.pkCooldowns.explorar < tiempoEspera) {
      let faltan = Math.ceil((tiempoEspera - (new Date() - user.pkCooldowns.explorar)) / 1000 / 60)
      return m.reply(`⏳ Debes descansar. Vuelve a explorar en ${faltan} minutos.`)
    }

    user.pkCooldowns.explorar = new Date() * 1
    let loot = Math.random()
    
    if (loot < 0.2) { // 20% de probabilidad de huevo
      user.pkHuevos++
      return m.reply('🥚 **¡Encontraste un Huevo Pokémon misterioso!**\nUsa `.pkhuevo` para incubarlo.')
    } else if (loot < 0.5) { // 30% de encontrar pokeballs
      user.pokeballs.super += 2
      return m.reply('🎒 Explorando la maleza encontraste **2x Superballs**.')
    } else if (loot < 0.7) { // 20% Caramelos
      user.pkMochila.caramelos++
      return m.reply('🍬 ¡Wow! Encontraste **1x Caramelo Raro** oculto en un arbusto.')
    } else { // 30% Monedas
      let oro = Math.floor(Math.random() * 300) + 100
      user.coin += oro
      return m.reply(`💰 Encontraste una pepita y la vendiste por **${oro} coins**.`)
    }
  }

  // ==========================================
  // 🥚 SISTEMA DE HUEVOS (NUEVO)
  // ==========================================
  if (command === 'pkhuevo') {
    if (args[0] === 'incubar') {
      if (user.pkHuevos <= 0) return m.reply('❌ No tienes huevos para incubar.')
      if (user.pkIncubadora.activo) return m.reply('❌ Ya tienes un huevo en la incubadora.')
      
      user.pkHuevos--
      user.pkIncubadora.activo = true
      user.pkIncubadora.tiempoHatch = (new Date() * 1) + (10 * 60 * 1000) // 10 minutos para eclosionar
      return m.reply('🌡️ Has puesto el huevo en la incubadora. Tardará 10 minutos en eclosionar.\nUsa `.pkhuevo eclosionar` más tarde.')
    }
    
    if (args[0] === 'eclosionar') {
      if (!user.pkIncubadora.activo) return m.reply('❌ No hay ningún huevo en la incubadora.')
      if (new Date() * 1 < user.pkIncubadora.tiempoHatch) {
        let faltan = Math.ceil((user.pkIncubadora.tiempoHatch - new Date()) / 1000 / 60)
        return m.reply(`⏳ Aún no está listo. Faltan ${faltan} minutos.`)
      }
      
      // Eclosión exitosa (Pokémon bebés o primera etapa)
      let bebesId = [172, 175, 446, 447, 438, 238, 239, 240] // Pichu, Togepi, Munchlax, Riolu, etc.
      let pokeId = bebesId[Math.floor(Math.random() * bebesId.length)]
      let data = await getPokeData(pokeId)
      
      user.pkIncubadora.activo = false
      user.pkIncubadora.tiempoHatch = 0
      user.pokemones.push(data)
      return conn.sendFile(m.chat, data.imagen, 'p.png', `🌟 ¡Oh! ¡El huevo eclosionó!\n¡Bienvenido al mundo, **${data.nombre}**!`, m)
    }

    return m.reply(`🥚 **TUS HUEVOS:** ${user.pkHuevos}\n🌡️ **Incubadora:** ${user.pkIncubadora.activo ? 'Ocupada' : 'Libre'}\n\nUsa:\n*${usedPrefix}pkhuevo incubar*\n*${usedPrefix}pkhuevo eclosionar*`)
  }

  // ==========================================
  // 🐉 INCURSIONES / RAIDS PvE (NUEVO)
  // ==========================================
  if (command === 'pkraid') {
    let tiempoEspera = 30 * 60 * 1000 // 30 mins
    if (new Date() - user.pkCooldowns.raid < tiempoEspera) {
      let faltan = Math.ceil((tiempoEspera - (new Date() - user.pkCooldowns.raid)) / 1000 / 60)
      return m.reply(`⏳ El jefe de la zona ha sido derrotado. Vuelve en ${faltan} minutos.`)
    }

    let miIdx = parseInt(args[0]) - 1
    if (!user.pokemones[miIdx]) return m.reply(`❌ Selecciona tu Pokémon luchador: *${usedPrefix}pkraid [Mi_ID]*`)
    
    let p1 = user.pokemones[miIdx]
    let bossId = [150, 249, 384, 483, 143][Math.floor(Math.random() * 5)] // Mewtwo, Lugia, Rayquaza, Dialga, Snorlax
    let boss = await getPokeData(bossId)
    boss.nivel = 50 + Math.floor(Math.random() * 30) // Boss nivel 50-80

    let p1Power = (p1.ataque + p1.defensa) + (p1.nivel * 10) + Math.floor(Math.random() * 100)
    let bossPower = (boss.ataque + boss.defensa) + (boss.nivel * 10) + Math.floor(Math.random() * 100)

    user.pkCooldowns.raid = new Date() * 1
    let txt = `⛈️ **¡INCURSIÓN SALVAJE!** ⛈️\n\nTe enfrentas al temible Jefe **${boss.nombre}** (Nvl ${boss.nivel}).\nTu **${p1.nombre}** ataca con todo...\n\n`
    
    if (p1Power > bossPower) {
      let recompensa = 2500
      user.coin += recompensa
      user.pkMochila.caramelos += 2
      txt += `🏆 **¡VICTORIA ÉPICA!**\nLograste derrotar al jefe. Obtienes 💰 ${recompensa} coins y 🍬 2 Caramelos Raros.`
    } else {
      txt += `💀 **DERROTA...**\nEl poder de ${boss.nombre} fue demasiado para ti. Entrena duro y vuelve a intentarlo.`
    }
    return conn.sendFile(m.chat, boss.imagen, 'boss.png', txt, m)
  }

  // ==========================================
  // ⚔️ DUELO POKÉMON (PvP MEJORADO)
  // ==========================================
  if (command === 'pkpelea') {
    let target = m.quoted ? m.quoted.sender : (m.mentionedJid?.[0] || null)
    if (!target) return m.reply('❌ Menciona a alguien o responde a su mensaje para retarlo.')
    
    let miIdx = parseInt(args[0]) - 1
    let suIdx = parseInt(args[1]) - 1
    let oppUser = global.db.data.users[target]

    if (!user.pokemones[miIdx] || !oppUser?.pokemones?.[suIdx]) {
      return m.reply(`❌ Uso: *${usedPrefix}pkpelea [Mi_ID] [Su_ID] @usuario*`)
    }

    let p1 = user.pokemones[miIdx]
    let p2 = oppUser.pokemones[suIdx]

    // Sistema de poder con ligera aleatoriedad para dar sorpresas
    let p1Power = (p1.ataque + p1.defensa + p1.velocidad) + (p1.nivel * 8) + Math.floor(Math.random() * 60)
    let p2Power = (p2.ataque + p2.defensa + p2.velocidad) + (p2.nivel * 8) + Math.floor(Math.random() * 60)

    let gano = p1Power > p2Power
    let premio = 400

    let batalla = `⚔️ **BATALLA POKÉMON** ⚔️\n\n`
    batalla += `🔴 ${p1.nombre} [${p1.tipos.join('/')}] (Nvl ${p1.nivel})\n🆚\n🔵 ${p2.nombre} [${p2.tipos.join('/')}] (Nvl ${p2.nivel})\n\n`
    
    if (gano) {
      user.coin += premio
      batalla += `🏆 ¡Ganaste! @${m.sender.split('@')[0]} recibe 💰 ${premio} coins.`
    } else {
      oppUser.coin += premio
      batalla += `💀 Perdiste. @${target.split('@')[0]} demostró ser superior y se lleva 💰 ${premio} coins.`
    }
    return conn.reply(m.chat, batalla, m, { mentions: [m.sender, target] })
  }

  // ==========================================
  // 🔄 TRADEO (INTERCAMBIO)
  // ==========================================
  if (command === 'pktradeo') {
    let target = m.quoted ? m.quoted.sender : null
    if (!target) return m.reply('❌ Responde al mensaje del jugador para intercambiar.')
    
    let miId = parseInt(args[0]) - 1
    let suId = parseInt(args[1]) - 1
    if (!user.pokemones[miId]) return m.reply('❌ No tienes ese Pokémon.')

    intercambios[target] = { emisor: m.sender, miId, suId }
    return m.reply(`🔄 @${m.sender.split('@')[0]} ofrece su Pokémon #${miId+1} por tu #${suId+1}.\nResponde *${usedPrefix}pkaceptar* para confirmar.`)
  }

  if (command === 'pkaceptar') {
    let t = intercambios[m.sender]
    if (!t) return m.reply('❌ No tienes ofertas pendientes.')
    let emisor = global.db.data.users[t.emisor]
    
    let pMio = user.pokemones.splice(t.suId, 1)[0]
    let pSuyo = emisor.pokemones.splice(t.miId, 1)[0]
    
    user.pokemones.push(pSuyo)
    emisor.pokemones.push(pMio)
    delete intercambios[m.sender]
    return m.reply('✅ ¡Intercambio completado exitosamente!')
  }

  // ==========================================
  // 🌿 MECÁNICAS: CAPTURAR Y VENDER
  // ==========================================
  if (command === 'pokemon') {
    let id = Math.floor(Math.random() * 898) + 1
    let data = await getPokeData(id)
    pokemonActivo[m.chat] = data
    return conn.sendFile(m.chat, data.imagen, 'p.png', `🌿 ¡Un **${data.nombre}** [${data.tipos.join('/')}] salvaje apareció!\nUsa: *${usedPrefix}atrapar [bola]*`, m)
  }

  if (command === 'atrapar') {
    let p = pokemonActivo[m.chat]
    if (!p) return m.reply('❌ No hay ningún Pokémon frente a ti en este chat.')
    let bola = (args[0] || 'normal').toLowerCase()
    if (!user.pokeballs[bola] || user.pokeballs[bola] <= 0) return m.reply(`❌ No tienes ${bola}balls. Compra en la tienda.`)

    user.pokeballs[bola]--
    let luck = Math.random()
    let rates = { normal: 0.3, super: 0.5, ultra: 0.8, master: 1.0 }
    
    delete pokemonActivo[m.chat]
    if (luck <= rates[bola]) {
      user.pokemones.push(p)
      return m.reply(`🎯 ¡Gotcha! **${p.nombre}** fue capturado con éxito.`)
    }
    return m.reply('💨 Oh no... el Pokémon escapó.')
  }

  if (command === 'pkvender') {
    let idx = parseInt(args[0]) - 1
    if (!user.pokemones[idx] || user.pokemones.length === 1) return m.reply('❌ No puedes vender a tu único Pokémon o el ID es inválido.')
    let p = user.pokemones[idx]
    let precio = (p.hp + p.ataque) * 3 + (p.nivel * 200)
    user.coin += precio
    user.pokemones.splice(idx, 1)
    return m.reply(`🤝 Vendiste a ${p.nombre} al Profesor Oak por 💰 ${precio} coins.`)
  }

  // ==========================================
  // 🏪 TIENDA Y MOCHILA
  // ==========================================
  if (command === 'pktienda') {
    const items = { normal: 100, super: 300, ultra: 800, master: 15000, caramelo: 2500 }
    let it = args[0]?.toLowerCase()
    let cant = parseInt(args[1]) || 1

    if (!items[it]) {
      let mart = `🏪 **POKÉMART**\n\n💰 Coins: ${user.coin}\n\n`
      for (let i in items) mart += `• ${i.toUpperCase()}: 💰 ${items[i]}\n`
      return m.reply(mart + `\nCompra: ${usedPrefix}pktienda [objeto] [cantidad]`)
    }

    let total = items[it] * cant
    if (user.coin < total) return m.reply('❌ No tienes suficiente dinero.')
    
    user.coin -= total
    if (it === 'caramelo') user.pkMochila.caramelos += cant
    else user.pokeballs[it] += cant
    return m.reply(`🛒 Compraste ${cant}x ${it.toUpperCase()}.`)
  }

  if (command === 'usar') {
    if (args[0] === 'caramelo') {
      let idx = parseInt(args[1]) - 1
      if (!user.pokemones[idx]) return m.reply('❌ Elige el ID numérico de tu Pokémon (ej: .usar caramelo 1).')
      if (user.pkMochila.caramelos <= 0) return m.reply('❌ No tienes caramelos raros.')
      
      user.pkMochila.caramelos--
      let p = user.pokemones[idx]
      p.nivel++
      p.ataque += 2; p.defensa += 2; p.hp += 5 // Mejora de stats al subir nivel
      
      // Evolución básica (puedes expandir este diccionario)
      const evos = { 1: 2, 2: 3, 4: 5, 5: 6, 7: 8, 8: 9, 172: 25, 25: 26 }
      if (p.nivel >= 16 && evos[p.id]) {
        let newData = await getPokeData(evos[p.id])
        newData.nivel = p.nivel // Mantiene el nivel tras evolucionar
        user.pokemones[idx] = newData
        return m.reply(`✨ ¡Increíble! ¡Tu Pokémon ha evolucionado a **${newData.nombre}**!`)
      }
      return m.reply(`🍬 Usaste un Caramelo Raro. **${p.nombre}** subió al Nivel ${p.nivel}. Sus stats mejoraron.`)
    }
  }

  if (command === 'mispokemon') {
    let txt = `🎒 **ENTRENADOR: ${conn.getName(m.sender)}**\n`
    txt += `💰 Coins: ${user.coin} | 🍬 Caramelos: ${user.pkMochila.caramelos} | 🥚 Huevos: ${user.pkHuevos}\n\n`
    user.pokemones.forEach((p, i) => {
      txt += `*${i + 1}.* ${p.nombre} [${p.tipos.join('/')}] (Lvl ${p.nivel})\n`
    })
    return m.reply(txt)
  }

  // ==========================================
  // 📖 MENÚ DE AYUDA ACTUALIZADO
  // ==========================================
  if (command === 'pkhelp') {
    let h = `🌟 **POKÉMON BOT - GUÍA MAESTRA** 🌟\n\n`
    h += `*BÁSICOS:*\n`
    h += `🌿 *${usedPrefix}pokemon* - Buscar salvajes\n`
    h += `🎯 *${usedPrefix}atrapar* [bola] - Capturar\n`
    h += `🎒 *${usedPrefix}mispokemon* - Tu equipo e inventario\n\n`
    h += `*AVENTURA:*\n`
    h += `🗺️ *${usedPrefix}pkexplorar* - Busca objetos y huevos\n`
    h += `🥚 *${usedPrefix}pkhuevo* - Menú de crianza\n`
    h += `🐉 *${usedPrefix}pkraid* [Mi_ID] - Lucha contra Jefes\n\n`
    h += `*COMPETITIVO:*\n`
    h += `⚔️ *${usedPrefix}pkpelea* [Mi_ID] [ID_Rival] @user - Duelo PvP\n`
    h += `🔄 *${usedPrefix}pktradeo* [Mi_ID] [ID_Suyo] - Intercambiar\n\n`
    h += `*TIENDA:*\n`
    h += `🏪 *${usedPrefix}pktienda* - PokéMart\n`
    h += `🍬 *${usedPrefix}usar caramelo* [ID] - Subir Nivel\n`
    h += `💰 *${usedPrefix}pkvender* [ID] - Vender por monedas\n`
    return m.reply(h)
  }
}

// --- UTILIDADES MEJORADAS ---
async function getPokeData(id) {
  const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
  const d = await r.json()
  // Extraer tipos elementales para mostrarlos
  const tipos = d.types.map(t => t.type.name.toUpperCase())
  
  return {
    nombre: d.name.toUpperCase(), 
    id: d.id,
    hp: d.stats[0].base_stat, 
    ataque: d.stats[1].base_stat, 
    defensa: d.stats[2].base_stat, 
    velocidad: d.stats[5].base_stat,
    tipos: tipos,
    imagen: d.sprites.other['official-artwork'].front_default,
    nivel: 1, 
    xp: 0
  }
}

handler.command = [
  'pkstart', 'pokemon', 'atrapar', 'pktienda', 'usar', 'pkvender', 
  'mispokemon', 'pkpelea', 'pktradeo', 'pkaceptar', 'pkreset', 
  'pkhelp', 'pkexplorar', 'pkhuevo', 'pkraid'
]
handler.group = true
export default handler
