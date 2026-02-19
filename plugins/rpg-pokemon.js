import fetch from 'node-fetch'

// Memoria volátil para sesiones de juego activas
let pokemonActivo = {}
let intercambios = {}
let crianzaPendiente = {}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  let user = global.db.data.users[m.sender]
  
  // ==========================================
  // ⚙️ INICIALIZACIÓN INTEGRAL DE DATOS
  // ==========================================
  if (!user.pokemones) user.pokemones = []
  if (typeof user.pkStarted === 'undefined') user.pkStarted = false
  if (typeof user.coin === 'undefined') user.coin = 500
  if (!user.pkMochila) user.pkMochila = { caramelos: 0, piedras: 0, pociones: 5 }
  if (!user.pkCooldowns) user.pkCooldowns = { explorar: 0, raid: 0, atrapar: 0, huevo: 0 }
  if (!user.pokeballs) user.pokeballs = { normal: 10, super: 2, ultra: 0, master: 0 }

  // ==========================================
  // 🎓 1. SISTEMA DE INICIO (LABORATORIO OAK)
  // ==========================================
  if (command === 'pkstart') {
    if (user.pkStarted) return m.reply('❌ ¡Ya eres un entrenador! No puedes volver a empezar.')
    let eleccion = parseInt(args[0])
    const iniciales = [1, 4, 7] // Bulbasaur, Charmander, Squirtle

    if (!eleccion || eleccion < 1 || eleccion > 3) {
      let menu = `╭━━━「 🧬 LABORATORIO POKÉMON 」━━━\n`
      menu += `┃ ¡Hola! Soy el Profesor Oak.\n┃ Elige a tu primer compañero:\n┃\n`
      menu += `┃ 1️⃣ Bulbasaur (Planta/Veneno)\n┃ 2️⃣ Charmander (Fuego)\n┃ 3️⃣ Squirtle (Agua)\n┃\n`
      menu += `┃ Uso: *${usedPrefix + command} [1-3]*\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━`
      return m.reply(menu)
    }

    let data = await getPokeData(iniciales[eleccion - 1])
    user.pokemones.push(data)
    user.pkStarted = true
    return conn.sendFile(m.chat, data.imagen, 'p.png', `✨ ¡Has recibido a **${data.nombre}**! Tu leyenda comienza hoy.`, m)
  }

  if (!user.pkStarted) return m.reply(`❌ Inicia tu aventura con *${usedPrefix}pkstart*`)

  // ==========================================
  // 🌿 2. EXPLORACIÓN Y CAPTURA
  // ==========================================
  if (command === 'pokemon') {
    let now = Date.now()
    if (now - user.pkCooldowns.explorar < 180000) { // 3 min
      let l = Math.ceil((user.pkCooldowns.explorar + 180000 - now) / 1000)
      return m.reply(`⏳ Estás cansado. Descansa *${Math.floor(l / 60)}m ${l % 60}s* antes de volver al pasto alto.`)
    }

    user.pkCooldowns.explorar = now
    let id = Math.floor(Math.random() * 898) + 1
    let data = await getPokeData(id)
    pokemonActivo[m.chat] = data

    let txt = `⭐ *¡POKÉMON SALVAJE!* ⭐\n\n`
    txt += `| **${data.nombre}**\n| Tipo: ${data.tipos}\n| Poder: ${data.ataque + data.defensa}\n\n`
    txt += `Usa: *${usedPrefix}atrapar [normal/super/ultra/master]*`
    return conn.sendFile(m.chat, data.imagen, 'p.png', txt, m)
  }

  if (command === 'atrapar') {
    if (!pokemonActivo[m.chat]) return m.reply('❌ No hay ningún Pokémon cerca.')
    let bola = (args[0] || 'normal').toLowerCase()
    if (!user.pokeballs[bola] || user.pokeballs[bola] <= 0) return m.reply(`❌ No tienes ${bola.toUpperCase()}BALLS.`)

    user.pokeballs[bola]--
    let p = pokemonActivo[m.chat]
    let luck = Math.random()
    let ratios = { normal: 0.35, super: 0.55, ultra: 0.80, master: 1.0 }
    
    delete pokemonActivo[m.chat]
    if (luck <= ratios[bola]) {
      user.pokemones.push(p)
      return m.reply(`🎯 ¡Felicidades! Capturaste a **${p.nombre}** con una ${bola.toUpperCase()}BALL.`)
    } else {
      return m.reply(`💨 ¡Oh no! El **${p.nombre}** rompió la bola y escapó a toda prisa.`)
    }
  }

  // ==========================================
  // 🥚 3. SISTEMA DE HUEVOS Y RAREZA
  // ==========================================
  if (command === 'pkhuevo') {
    let now = Date.now()
    if (now - user.pkCooldowns.huevo < 3600000) { // 1 hora
      let l = Math.ceil((user.pkCooldowns.huevo + 3600000 - now) / 60000)
      return m.reply(`⏳ Tu incubadora está ocupada. Falta *${l} minutos* para que eclosione el siguiente.`)
    }

    if (user.coin < 1000) return m.reply('❌ Necesitas 💰 1,000 coins para una incubadora.')
    user.coin -= 1000
    user.pkCooldowns.huevo = now
    
    await m.reply('🥚 *Colocando huevo en la incubadora...*')
    setTimeout(async () => {
      let r = Math.random()
      let id;
      if (r < 0.01) id = 151; // 1% Mew (Legendario)
      else if (r < 0.10) id = Math.floor(Math.random() * 10) + 147; // 10% Raro (Dratini, etc)
      else id = Math.floor(Math.random() * 800) + 1; // Común

      let data = await getPokeData(id)
      user.pokemones.push(data)
      conn.reply(m.chat, `🐣 ¡El huevo eclosionó! Nació un **${data.nombre}** #${id}.`, m)
    }, 5000) // Simulación rápida para el usuario
  }

  // ==========================================
  // ⚔️ 4. RAIDS, NIVELES Y XP (DETALLADO)
  // ==========================================
  if (command === 'raid' || command === 'pkincursion') {
    let idx = parseInt(args[0]) - 1
    if (!user.pokemones[idx]) return m.reply(`❌ Elige tu pokémon: *${usedPrefix}raid [ID]*`)
    
    let now = Date.now()
    if (now - user.pkCooldowns.raid < 300000) return m.reply('⏳ Tu Pokémon está agotado de la última batalla.')
    
    user.pkCooldowns.raid = now
    let p = user.pokemones[idx]
    let expGanada = Math.floor(Math.random() * 50) + 30
    let coins = Math.floor(Math.random() * 200) + 100
    
    p.xp += expGanada
    user.coin += coins
    
    let res = `🌋 **RESULTADO DE INCURSIÓN** 🌋\n\n`
    res += `🥊 Pokémon: ${p.nombre}\n📈 EXP: +${expGanada}\n💰 Coins: +${coins}\n`
    
    // Cálculo de XP necesaria: (Nivel * 100)
    let xpNecesaria = p.nivel * 100
    if (p.xp >= xpNecesaria) {
      p.nivel++
      p.xp -= xpNecesaria
      p.hp += 10; p.ataque += 5; p.defensa += 5
      res += `\n⭐ ¡SUBIDA DE NIVEL! Ahora es **Nivel ${p.nivel}**`
    } else {
      res += `📊 XP Faltante para Lvl ${p.nivel + 1}: *${xpNecesaria - p.xp} XP*`
    }
    return m.reply(res)
  }

  // ==========================================
  // 🎒 5. MOCHILA Y ESTADÍSTICAS
  // ==========================================
  if (command === 'mispokemon') {
    let txt = `🎒 **MOCHILA DE ENTRENADOR**\n`
    txt += `💰 Coins: ${user.coin} | 🥚 Siguiente Huevo: ${user.pkCooldowns.huevo ? 'En proceso' : 'Listo'}\n`
    txt += `🔴 x${user.pokeballs.normal} | 🔵 x${user.pokeballs.super} | 🟡 x${user.pokeballs.ultra} | 🟣 x${user.pokeballs.master}\n\n`
    
    user.pokemones.slice(0, 20).forEach((p, i) => {
      let xpBar = `[${'■'.repeat(Math.floor((p.xp / (p.nivel * 100)) * 10))}${'□'.repeat(10 - Math.floor((p.xp / (p.nivel * 100)) * 10))}]`
      txt += `*${i + 1}.* ${p.nombre} (Lvl ${p.nivel})\n   ${xpBar} ${p.xp}/${p.nivel * 100}\n`
    })
    return m.reply(txt + `\n_Usa ${usedPrefix}pkstats [ID] para detalles._`)
  }

  // ==========================================
  // 🏪 6. TIENDA Y VENTA
  // ==========================================
  if (command === 'pktienda') {
    let items = { normal: 50, super: 150, ultra: 500, master: 10000, caramelo: 1000 }
    let item = args[0]
    let cant = parseInt(args[1]) || 1

    if (!items[item]) {
      let store = `🏪 **POKÉMART**\n\n`
      for (let i in items) store += `• ${i.toUpperCase()}: 💰 ${items[i]}\n`
      return m.reply(store + `\nCompra: ${usedPrefix}pktienda [item] [cantidad]`)
    }

    let total = items[item] * cant
    if (user.coin < total) return m.reply('❌ Saldo insuficiente.')
    
    user.coin -= total
    if (item === 'caramelo') user.pkMochila.caramelos += cant
    else user.pokeballs[item] += cant
    return m.reply(`🛒 Compraste ${cant} ${item}(s).`)
  }

  // ==========================================
  // 🔄 7. TRADEO E INTERCAMBIO
  // ==========================================
  if (command === 'pktradeo') {
    let target = m.quoted ? m.quoted.sender : null
    if (!target) return m.reply('❌ Responde a alguien para tradear.')
    let miId = parseInt(args[0]) - 1
    let suId = parseInt(args[1]) - 1

    if (!user.pokemones[miId]) return m.reply('❌ No tienes ese Pokémon.')
    intercambios[target] = { emisor: m.sender, miId, suId }
    return conn.reply(m.chat, `🔄 @${m.sender.split('@')[0]} propone un intercambio. \nResponde con *${usedPrefix}pkaceptar*`, m, { mentions: [m.sender] })
  }

  if (command === 'pkaceptar') {
    let o = intercambios[m.sender]
    if (!o) return m.reply('❌ No hay ofertas.')
    let emisor = global.db.data.users[o.emisor]
    
    let p1 = emisor.pokemones.splice(o.miId, 1)[0]
    let p2 = user.pokemones.splice(o.suId, 1)[0]
    
    emisor.pokemones.push(p2)
    user.pokemones.push(p1)
    delete intercambios[m.sender]
    return m.reply('✅ ¡Intercambio completado con éxito!')
  }

  // ==========================================
  // 📖 8. AYUDA Y COMANDOS
  // ==========================================
  if (command === 'pkhelp') {
    let help = `🌟 **MENÚ MAESTRO POKÉMON** 🌟\n\n`
    help += `🌿 *${usedPrefix}pokemon* - Explorar\n`
    help += `🎯 *${usedPrefix}atrapar* - Capturar\n`
    help += `🎒 *${usedPrefix}mispokemon* - Ver equipo\n`
    help += `⚔️ *${usedPrefix}raid* - Subir nivel/XP\n`
    help += `🏪 *${usedPrefix}pktienda* - Comprar bolas\n`
    help += `🥚 *${usedPrefix}pkhuevo* - Eclosionar raros\n`
    help += `🔄 *${usedPrefix}pktradeo* - Intercambiar\n`
    help += `💰 *${usedPrefix}pkvender [ID]* - Ganar coins\n\n`
    help += `_Tip: Mew solo sale en huevos con 1% de suerte._`
    return m.reply(help)
  }
}

// ==========================================
// 🛠️ MOTOR DE DATOS (POKEAPI)
// ==========================================
async function getPokeData(id) {
  const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
  const d = await r.json()
  return {
    nombre: d.name.toUpperCase(),
    id: d.id,
    tipos: d.types.map(t => t.type.name).join('/'),
    hp: d.stats[0].base_stat,
    ataque: d.stats[1].base_stat,
    defensa: d.stats[2].base_stat,
    velocidad: d.stats[5].base_stat,
    imagen: d.sprites.other['official-artwork'].front_default,
    nivel: 1,
    xp: 0
  }
}

handler.command = ['pkstart', 'pokemon', 'atrapar', 'mispokemon', 'pktienda', 'pkhuevo', 'raid', 'pkincursion', 'pktradeo', 'pkaceptar', 'pkhelp', 'pkvender']
handler.group = true
export default handler
