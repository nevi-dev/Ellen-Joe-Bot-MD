import fetch from 'node-fetch'

// Memoria volátil para encuentros y ofertas
let pokemonActivo = {}
let intercambios = {}

let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
  let user = global.db.data.users[m.sender]
  const adminNumber = '18493873691' // Tu número configurado

  // ==========================================
  // ⚙️ INICIALIZACIÓN INTEGRAL (ANTI-BUG)
  // ==========================================
  if (!user.pokemones) user.pokemones = []
  if (typeof user.pkStarted === 'undefined') user.pkStarted = false
  if (typeof user.coin === 'undefined') user.coin = 1000
  if (!user.pkMochila) user.pkMochila = { caramelos: 0, pociones: 5 }
  if (!user.pkCooldowns) user.pkCooldowns = { explorar: 0, raid: 0, huevo: 0 }
  if (!user.pokeballs) user.pokeballs = { normal: 10, super: 5, ultra: 2, master: 0 }

  // ==========================================
  // 🚫 COMANDO RESET GLOBAL (SOLO TÚ)
  // ==========================================
  if (command === 'pkreset') {
    let senderNum = m.sender.split('@')[0]
    if (senderNum !== adminNumber && !isOwner) return m.reply('❌ Acceso denegado. Solo el Desarrollador puede reiniciar el mundo Pokémon.')
    
    let users = global.db.data.users
    Object.keys(users).forEach(id => {
      users[id].pokemones = []
      users[id].pkStarted = false
      users[id].coin = 1000
      users[id].pkMochila = { caramelos: 0, pociones: 5 }
      users[id].pokeballs = { normal: 10, super: 5, ultra: 2, master: 0 }
    })
    return m.reply('🧹 **APOCALIPSIS POKÉMON:** Todos los datos han sido borrados. El mundo ha vuelto a nacer.')
  }

  // ==========================================
  // 🎓 INICIO: LABORATORIO OAK
  // ==========================================
  if (command === 'pkstart') {
    if (user.pkStarted) return m.reply('❌ Ya tienes un compañero Pokémon. ¡Ve a explorar!')
    let choice = parseInt(args[0])
    if (![1, 2, 3].includes(choice)) {
      let texto = `╭━━━━「 🎓 PROFESOR OAK 」━━━━\n`
      texto += `┃ ¡Hola! Bienvenido al mundo Pokémon.\n┃ Elige a tu primer compañero:\n┃\n`
      texto += `┃ 1️⃣ Bulbasaur 🍃 (Planta)\n┃ 2️⃣ Charmander 🔥 (Fuego)\n┃ 3️⃣ Squirtle 💧 (Agua)\n┃\n`
      texto += `┃ Uso: *${usedPrefix}pkstart [1-3]*\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━`
      return m.reply(texto)
    }
    
    let ids = [1, 4, 7]
    let data = await getPokeData(ids[choice - 1])
    user.pokemones.push(data)
    user.pkStarted = true
    return conn.sendFile(m.chat, data.imagen, 'p.png', `✨ ¡Felicidades! Has recibido a **${data.nombre}**. ¡Cuídalo mucho!`, m)
  }

  // Bloqueo si no ha empezado
  if (!user.pkStarted) return m.reply(`❌ Primero debes hablar con el Profesor Oak usando *${usedPrefix}pkstart*`)

  // ==========================================
  // ⚔️ DUELO POKÉMON (PvP)
  // ==========================================
  if (command === 'pkpelea') {
    let target = m.quoted ? m.quoted.sender : (m.mentionedJid?.[0] || null)
    if (!target) return m.reply('❌ Menciona a alguien o responde a su mensaje para retarlo.')
    
    let miIdx = parseInt(args[0]) - 1
    let suIdx = parseInt(args[1]) - 1
    let oppUser = global.db.data.users[target]

    if (!user.pokemones[miIdx] || !oppUser?.pokemones?.[suIdx]) {
      return m.reply(`❌ Uso: *${usedPrefix}pkpelea [Mi_ID] [Su_ID]*\nEjemplo: .pkpelea 1 1`)
    }

    let p1 = user.pokemones[miIdx]
    let p2 = oppUser.pokemones[suIdx]

    let p1Power = (p1.ataque + p1.defensa + p1.velocidad) + (p1.nivel * 8) + Math.floor(Math.random() * 60)
    let p2Power = (p2.ataque + p2.defensa + p2.velocidad) + (p2.nivel * 8) + Math.floor(Math.random() * 60)

    let gano = p1Power > p2Power
    let premio = 400

    let batalla = `⚔️ **BATALLA POKÉMON** ⚔️\n\n`
    batalla += `🔴 ${p1.nombre} (Nvl ${p1.nivel}) vs 🔵 ${p2.nombre} (Nvl ${p2.nivel})\n\n`
    
    if (gano) {
      user.coin += premio
      batalla += `🏆 ¡Ganaste! @${m.sender.split('@')[0]} recibe 💰 ${premio} coins.`
    } else {
      oppUser.coin += premio
      batalla += `💀 Perdiste. @${target.split('@')[0]} se lleva el premio.`
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
    if (!t) return m.reply('❌ No tienes ofertas.')
    let emisor = global.db.data.users[t.emisor]
    
    let pMio = user.pokemones.splice(t.suId, 1)[0]
    let pSuyo = emisor.pokemones.splice(t.miId, 1)[0]
    
    user.pokemones.push(pSuyo)
    emisor.pokemones.push(pMio)
    delete intercambios[m.sender]
    return m.reply('✅ ¡Intercambio completado!')
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
      if (!user.pokemones[idx]) return m.reply('❌ Elige un Pokémon de tu mochila.')
      if (user.pkMochila.caramelos <= 0) return m.reply('❌ No tienes caramelos raros.')
      
      user.pkMochila.caramelos--
      let p = user.pokemones[idx]
      p.nivel++
      p.xp = 0
      
      // Lógica de evolución automática
      const evos = { 1: 2, 2: 3, 4: 5, 5: 6, 7: 8, 8: 9 } // Ejemplo: Bulba -> Ivysaur
      if (p.nivel >= 16 && evos[p.id]) {
        let newData = await getPokeData(evos[p.id])
        p.nombre = newData.nombre; p.id = newData.id; p.imagen = newData.imagen
        m.reply(`✨ ¡Increíble! Tu Pokémon ha evolucionado a **${p.nombre}**!`)
      }
      return m.reply(`🍬 Usaste un Caramelo Raro. **${p.nombre}** subió al Nivel ${p.nivel}.`)
    }
  }

  // ==========================================
  // 🌿 MECÁNICAS DE JUEGO (CAPTURAR/VENDER)
  // ==========================================
  if (command === 'pokemon') {
    let id = Math.floor(Math.random() * 898) + 1
    let data = await getPokeData(id)
    pokemonActivo[m.chat] = data
    return conn.sendFile(m.chat, data.imagen, 'p.png', `🌿 **${data.nombre}** salvaje!\nUsa: *${usedPrefix}atrapar [bola]*`, m)
  }

  if (command === 'atrapar') {
    let p = pokemonActivo[m.chat]
    if (!p) return m.reply('❌ No hay ningún Pokémon frente a ti.')
    let bola = (args[0] || 'normal').toLowerCase()
    if (user.pokeballs[bola] <= 0) return m.reply(`❌ No tienes ${bola}balls.`)

    user.pokeballs[bola]--
    let luck = Math.random()
    let rates = { normal: 0.3, super: 0.5, ultra: 0.8, master: 1.0 }
    
    delete pokemonActivo[m.chat]
    if (luck <= rates[bola]) {
      user.pokemones.push(p)
      return m.reply(`🎯 ¡Gotcha! **${p.nombre}** capturado.`)
    }
    return m.reply('💨 Escapó...')
  }

  if (command === 'pkvender') {
    let idx = parseInt(args[0]) - 1
    if (!user.pokemones[idx] || user.pokemones.length === 1) return m.reply('❌ No puedes vender ese Pokémon.')
    let p = user.pokemones[idx]
    let precio = (p.hp + p.ataque) * 3 + (p.nivel * 200)
    user.coin += precio
    user.pokemones.splice(idx, 1)
    return m.reply(`🤝 Vendiste a ${p.nombre} por 💰 ${precio} coins.`)
  }

  if (command === 'mispokemon') {
    let txt = `🎒 **ENTRENADOR: ${conn.getName(m.sender)}**\n`
    txt += `💰 Coins: ${user.coin} | 🍬 Caramelos: ${user.pkMochila.caramelos}\n\n`
    user.pokemones.forEach((p, i) => {
      let xpBar = `[${'■'.repeat(Math.floor(i%10))}${'□'.repeat(10-Math.floor(i%10))}]`
      txt += `*${i + 1}.* ${p.nombre} (Lvl ${p.nivel})\n`
    })
    return m.reply(txt)
  }

  // ==========================================
  // 📖 MENÚ DE AYUDA (INTEGRADO)
  // ==========================================
  if (command === 'pkhelp') {
    let h = `🌟 **POKÉMON BOT - GUÍA** 🌟\n\n`
    h += `🌿 *${usedPrefix}pokemon* - Buscar salvajes\n`
    h += `🎯 *${usedPrefix}atrapar* [bola] - Capturar\n`
    h += `⚔️ *${usedPrefix}pkpelea* [ID] [ID_Rival] - Duelo PvP\n`
    h += `🔄 *${usedPrefix}pktradeo* - Intercambiar\n`
    h += `🏪 *${usedPrefix}pktienda* - PokéMart\n`
    h += `🍬 *${usedPrefix}usar caramelo* [ID] - Subir Nivel\n`
    h += `💰 *${usedPrefix}pkvender* [ID] - Vender\n`
    h += `🎒 *${usedPrefix}mispokemon* - Tu equipo\n`
    h += `🧹 *${usedPrefix}pkreset* - Reiniciar todo (Admin)\n`
    return m.reply(h)
  }
}

// --- UTILIDADES ---
async function getPokeData(id) {
  const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
  const d = await r.json()
  return {
    nombre: d.name.toUpperCase(), id: d.id,
    hp: d.stats[0].base_stat, ataque: d.stats[1].base_stat, 
    defensa: d.stats[2].base_stat, velocidad: d.stats[5].base_stat,
    imagen: d.sprites.other['official-artwork'].front_default,
    nivel: 1, xp: 0
  }
}

handler.command = ['pkstart', 'pokemon', 'atrapar', 'pktienda', 'usar', 'pkvender', 'mispokemon', 'pkpelea', 'pktradeo', 'pkaceptar', 'pkreset', 'pkhelp']
handler.group = true
export default handler
