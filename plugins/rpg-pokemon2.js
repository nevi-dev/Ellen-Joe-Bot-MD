import fetch from 'node-fetch'

let ligaCombates = {}
let apiCache = {}

// --- LÍDERES CON IDs COMPATIBLES ---
const TODOS_LOS_GYMS = [
  { n: "Brock", pId: "onix", lvl: 14, med: "Roca" },
  { n: "Misty", pId: "starmie", lvl: 20, med: "Cascada" },
  { n: "Lt. Surge", pId: "raichu", lvl: 26, med: "Trueno" },
  { n: "Erika", pId: "vileplume", lvl: 32, med: "Arcoiris" },
  { n: "Koga", pId: "weezing", lvl: 38, med: "Alma" },
  { n: "Sabrina", pId: "alakazam", lvl: 44, med: "Pantano" },
  { n: "Blaine", pId: "arcanine", lvl: 50, med: "Volcán" },
  { n: "Giovanni", pId: "rhydon", lvl: 58, med: "Tierra" },
  { n: "Pegaso", pId: "pidgeotto", lvl: 62, med: "Céfiro" },
  { n: "Antón", pId: "scyther", lvl: 65, med: "Colmena" },
  { n: "Blanca", pId: "miltank", lvl: 70, med: "Planicie" },
  { n: "Morti", pId: "gengar", lvl: 75, med: "Niebla" },
  { n: "Aníbal", pId: "poliwrath", lvl: 80, med: "Tormenta" },
  { n: "Yasmina", pId: "steelix", lvl: 85, med: "Mineral" },
  { n: "Fredo", pId: "piloswine", lvl: 90, med: "Glaciar" },
  { n: "Débora", pId: "kingdra", lvl: 98, med: "Dragón" },
  { n: "Petra", pId: "nosepass", lvl: 105, med: "Piedra" },
  { n: "Marcial", pId: "makuhita", lvl: 110, med: "Puño" },
  { n: "Erico", pId: "manectric", lvl: 115, med: "Dinamo" },
  { n: "Candela", pId: "torkoal", lvl: 120, med: "Calor" },
  { n: "Norman", pId: "slaking", lvl: 125, med: "Equilibrio" },
  { n: "Alana", pId: "altaria", lvl: 130, med: "Pluma" },
  { n: "Vito y Leti", pId: "lunatone", lvl: 135, med: "Mente" },
  { n: "Plubio", pId: "milotic", lvl: 145, med: "Lluvia" },
  { n: "Roco", pId: "cranidos", lvl: 155, med: "Ladrillo" },
  { n: "Gardenia", pId: "roserade", lvl: 160, med: "Bosque" },
  { n: "Brega", pId: "lucario", lvl: 165, med: "Cobalto" },
  { n: "Mananti", pId: "floatzel", lvl: 170, med: "Ciénaga" },
  { n: "Fantina", pId: "mismagius", lvl: 175, med: "Reliquia" },
  { n: "Acerón", pId: "bastiodon", lvl: 180, med: "Mina" },
  { n: "Inverna", pId: "froslass", lvl: 185, med: "Iceberg" },
  { n: "Lectro", pId: "electivire", lvl: 195, med: "Faro" },
  { n: "Camila", pId: "zebstrika", lvl: 205, med: "Voltio" },
  { n: "Yakón", pId: "excadrill", lvl: 210, med: "Temblor" },
  { n: "Gerania", pId: "swanna", lvl: 215, med: "Chorro" },
  { n: "Junco", pId: "cryogonal", lvl: 220, med: "Icicle" },
  { n: "Lirio", pId: "haxorus", lvl: 230, med: "Leyenda" },
  { n: "Hiedra", pId: "scolipede", lvl: 240, med: "Ponzoña" },
  { n: "Ciprián", pId: "jellicent", lvl: 250, med: "Ola" },
  { n: "Cheren", pId: "stoutland", lvl: 260, med: "Base" },
  { n: "Violeta", pId: "vivillon", lvl: 270, med: "Insecto" },
  { n: "Lino", pId: "tyrantrum", lvl: 280, med: "Muro" },
  { n: "Corelia", pId: "lucario", lvl: 290, med: "Lid" },
  { n: "Amaro", pId: "gogoat", lvl: 300, med: "Hoja" },
  { n: "Lem", pId: "heliolisk", lvl: 310, med: "Voltaje" },
  { n: "Valeria", pId: "sylveon", lvl: 320, med: "Hada" },
  { n: "Ástrid", pId: "meowstic", lvl: 330, med: "Psique" },
  { n: "Édel", pId: "avalugg", lvl: 350, med: "Iceberg" },
  { n: "Kaudan", pId: "crabominable", lvl: 370, med: "Melemele" },
  { n: "Mayla", pId: "lycanroc-midday", lvl: 390, med: "Akala" },
  { n: "Denio", pId: "krookodile", lvl: 410, med: "Ula-Ula" },
  { n: "Hela", pId: "mudsdale", lvl: 430, med: "Poni" },
  { n: "Gladio", pId: "silvally", lvl: 450, med: "Cero" },
  { n: "Guzmán", pId: "golisopod", lvl: 470, med: "Siniestra" },
  { n: "Lylia", pId: "clefable", lvl: 490, med: "Éter" },
  { n: "Kukui", pId: "incineroar", lvl: 520, med: "Z" },
  { n: "Percy", pId: "eldegoss", lvl: 550, med: "Planta" },
  { n: "Cathy", pId: "drednaw", lvl: 580, med: "Agua" },
  { n: "Naboru", pId: "centiskorch", lvl: 610, med: "Fuego" },
  { n: "Judith", pId: "sirfetchd", lvl: 640, med: "Lucha" },
  { n: "Alis", pId: "alcremie", lvl: 670, med: "Hada" },
  { n: "Mel", pId: "lapras", lvl: 700, med: "Hielo" },
  { n: "Raihan", pId: "duraludon", lvl: 750, med: "Dragón" },
  { n: "Piers", pId: "obstagoon", lvl: 800, med: "Siniestra" }
]

async function fetchAPI(endpoint) {
  if (apiCache[endpoint]) return apiCache[endpoint]
  try {
    const r = await fetch(`https://pokeapi.co/api/v2/${endpoint}`)
    if (!r.ok) return null
    const data = await r.json()
    apiCache[endpoint] = data
    return data
  } catch (e) { return null }
}

async function buildPokemonObj(idOrName, level = 1) {
  const cleanId = idOrName.toString().toLowerCase().trim().replace(/\s+/g, '-')
  const d = await fetchAPI(`pokemon/${cleanId}`)
  if (!d) return null
  
  let movesDisponibles = d.moves.filter(m => m.version_group_details[0].move_learn_method.name === 'level-up')
  let shuffled = movesDisponibles.sort(() => 0.5 - Math.random()).slice(0, 4)
  
  let moves = await Promise.all(shuffled.map(async (m) => {
    let moveData = await fetchAPI(`move/${m.move.name}`)
    return { 
      nombre: moveData?.name?.toUpperCase()?.replace('-', ' ') || 'GOLPE', 
      poder: moveData?.power || 50, 
      tipo: moveData?.type?.name?.toUpperCase() || 'NORMAL' 
    }
  }))

  return {
    id: d.id,
    nombre: d.name.toUpperCase(),
    nivel: level,
    tipos: d.types.map(t => t.type.name.toUpperCase()),
    imagen: d.sprites.other['official-artwork'].front_default || d.sprites.front_default,
    hp: Math.floor(d.stats[0].base_stat * 3 + (level * 5)),
    atk: d.stats[1].base_stat + level,
    def: d.stats[2].base_stat + level,
    moves
  }
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  let user = global.db.data.users[m.sender]
  if (!user) return 
  if (!user.medallas) user.medallas = []
  if (!user.pokemones) user.pokemones = []

  const subCommand = args[0]?.toLowerCase()

  if (command === 'pkliga') {
    // --- LÓGICA DE ATAQUE ---
    if (subCommand === 'atacar') {
      let b = ligaCombates[m.sender]
      if (!b) return m.reply(`❌ No tienes un combate activo.`)
      
      let moveIdx = parseInt(args[1]) - 1
      if (isNaN(moveIdx) || !b.p1.moves[moveIdx]) return m.reply('❌ Elige un ataque válido (1-4).')

      let log = `⚔️ **${b.p1.nombre}** usó **${b.p1.moves[moveIdx].nombre}**`
      let dmg1 = Math.floor((((2 * b.p1.nivel / 5 + 2) * b.p1.moves[moveIdx].poder * b.p1.atk / b.p2.def) / 50 + 2))
      b.p2.currentHp -= Math.max(1, dmg1)
      log += ` (-${dmg1} HP)\n`

      if (b.p2.currentHp > 0) {
        let cpuMove = b.p2.moves[Math.floor(Math.random() * b.p2.moves.length)]
        let dmg2 = Math.floor((((2 * b.p2.nivel / 5 + 2) * cpuMove.poder * b.p2.atk / b.p1.def) / 50 + 2))
        b.p1.currentHp -= Math.max(1, dmg2)
        log += `💥 **${b.p2.nombre}** usó **${cpuMove.nombre}** (-${dmg2} HP)`
      }

      if (b.p1.currentHp <= 0 || b.p2.currentHp <= 0) {
        let gano = b.p1.currentHp > 0
        delete ligaCombates[m.sender]
        if (gano) {
          user.medallas.push(b.dataGym.med)
          user.coin = (user.coin || 0) + (b.dataGym.lvl * 200)
          return m.reply(`${log}\n\n🎊 **¡DERROTASTE AL LÍDER!**\nObtienes la Medalla ${b.dataGym.med}.`)
        } else {
          return m.reply(`${log}\n\n💀 **DERROTA.** Entrena a tus Pokémon.`)
        }
      }
      return renderBattle(m, conn, b, log)
    }

    // --- LÓGICA DE GIMNASIOS ---
    let nMedallas = user.medallas.length
    if (nMedallas >= TODOS_LOS_GYMS.length) return m.reply("🏆 ¡YA ERES EL MAESTRO SUPREMO!")

    let gym = TODOS_LOS_GYMS[nMedallas]
    let miIdx = parseInt(args[0]) - 1

    if (isNaN(miIdx)) {
      let pokeLider = await buildPokemonObj(gym.pId, gym.lvl)
      if (!pokeLider) return m.reply("❌ Error en PokéAPI.")
      let txt = `🏟️ **GIMNASIO #${nMedallas + 1}**\n👤 **Líder:** ${gym.n}\n🏅 **Medalla:** ${gym.med}\n👾 **Rival:** ${pokeLider.nombre} (Nv. ${gym.lvl})\n\n👉 *Desafiar:* \`${usedPrefix}pkliga [ID Pokémon]\``
      return conn.sendFile(m.chat, pokeLider.imagen, 'l.png', txt, m)
    }

    // --- VALIDACIÓN DE TU POKÉMON ---
    let miPokeDb = user.pokemones[miIdx]
    if (!miPokeDb) return m.reply(`❌ No tienes el Pokémon #${miIdx + 1}.`)

    // Si tu Pokémon existe pero tiene datos null, esto lo salva:
    let miPokeSeguro = {
      nombre: miPokeDb.nombre || "POKÉMON",
      nivel: miPokeDb.nivel || 1,
      hp: miPokeDb.hp || 100, // <--- Evita el error de null
      atk: miPokeDb.atk || 50,
      def: miPokeDb.def || 50,
      moves: miPokeDb.moves && miPokeDb.moves.length > 0 ? miPokeDb.moves : [{ nombre: 'PLACAJE', poder: 40 }]
    }

    let p2 = await buildPokemonObj(gym.pId, gym.lvl)
    if (!p2) return m.reply("❌ Error al cargar líder.")

    ligaCombates[m.sender] = {
      p1: { ...miPokeSeguro, currentHp: miPokeSeguro.hp, maxHp: miPokeSeguro.hp },
      p2: { ...p2, currentHp: p2.hp, maxHp: p2.hp, nombre: `LÍDER ${gym.n.toUpperCase()}` },
      dataGym: gym
    }
    
    return renderBattle(m, conn, ligaCombates[m.sender])
  }
}

function renderBattle(m, conn, b, log = '') {
  let txt = `🏟️ **LIGA POKÉMON**\n\n👤 **${b.p2.nombre}**\n💖 HP: ${Math.max(0, b.p2.currentHp)}/${b.p2.maxHp}\n`
  txt += `━━━━━━━━━━━━━━\n✨ **TU ${b.p1.nombre}**\n💖 HP: ${Math.max(0, b.p1.currentHp)}/${b.p1.maxHp}\n\n`
  if (log) txt += `💬 ${log}\n\n`
  
  // Listar ataques del jugador
  b.p1.moves.forEach((v, i) => { 
    txt += `[${i + 1}] ${v.nombre}\n` 
  })
  
  txt += `\n➡️ Ataca con: *.pkliga atacar [1-4]*`
  return conn.sendFile(m.chat, b.p2.imagen, 'b.png', txt, m)
}

handler.command = ['pkliga']
export default handler
