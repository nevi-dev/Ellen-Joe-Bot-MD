import { watchFile, unwatchFile } from 'fs' 
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import fs from 'fs'
import cheerio from 'cheerio'
import fetch from 'node-fetch'
import axios from 'axios'
import moment from 'moment-timezone' 

//*─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*

//BETA: Si quiere evitar escribir el número que será bot en la consola, agregué desde aquí entonces:
//Sólo aplica para opción 2 (ser bot con código de texto de 8 digitos)
global.botNumber = '' //Ejemplo: 573218138672

//*─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*

global.owner = [
// <-- Número @s.whatsapp.net -->
  ['18096758983', '⟆⃝༉⃟⸙ ᯽ N͙e͙v͙i͙-D͙e͙v͙ ⌗⚙️࿐', true],
  ['18294868853', '⏤͟͞ू⃪ ፝͜⁞𝘿𝙞𝙤𝙣𝙚𝙞𝙗𝙞-ʳⁱᵖ ִֶ ࣪˖ ִֶָ🐇་༘', true],
  ['5218136068555', 'ellen', true],
  ['16028790660', 'frank', true],
  ['5491162193554', 'only', true],
  ['5216141569718', 'dino', true],
  ['573229506110', 'duarte', true],
];

//*─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*

global.mods = []
global.suittag = ['18096758983']
global.prems = []

//*─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*

global.libreria = 'Baileys'
global.baileys = 'V 6.7.16'
global.languaje = 'Español'
global.vs = '2.2.0'
global.nameqr = 'ellen-joe-bot'
global.namebot = 'ᯓ★ 𝑬𝒍𝒍𝒆𝒏 𝑱𝒐𝒆 𝑩𝒐𝒕 ִֶָ ࣪ ִֶָ🪽་༘࿐'
global.Ellensessions = 'EllenSessions'
global.jadi = 'EllenJadiBots'
global.EllenJadibts = true

//*─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*

global.fkontak = {
	key: {
		participant: '0@s.whatsapp.net',
		remoteJid: 'status@broadcast'
	},
	message: {
		contactMessage: {
			displayName: `Ellen-Joe Bot`,
			vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;Ellen-Joe Bot;;;\nFN:Ellen-Joe Bot\nitem1.TEL;waid=1234567890:1234567890\nitem1.X-ABLabel:Bot\nEND:VCARD`
		}
	}
};

// Define APIKeys como un objeto vacío para evitar el segundo error.
// Esto es necesario aunque no uses API keys.
global.APIKeys = {};
//*─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*

global.packname = '🦈⟶꯭̽𝑬𝒍𝒍𝒆𝒏 ꯭𝑱𝒐𝒆͙𝆭͢͟⎯̽―̥ 𝑺𝒉𝒂𝒓𝒌 𝑸𝒖𝒆𝒆𝒏'
global.botname = '⏤͟͟͞͞⸙ְ̻࠭🦈ᩙ 𝙀𝙡𝙡𝙚𝙣 𝙅𝙤𝙚 𝘽𝙤𝙩 𝙈𝘿 𑂘⃘۪〬🫐ᩙ⸙ְ̻࠭'
global.wm = '🌹⟶꯭̽𝐄𝐥𝐥𝐞᪱͢𝐧 ͞ ̵𝆭⎯꯭̽𝐉𝐨࡙ͥ͞𝐞ͣ͟ 𝐁𝐨࡙ͫ𝐭꯭͠⎯̽―̥ 𝐌𝐃 🌹'
global.author = '𐔌 𝗡𝗲𝘃𝗶-𝗗𝗲𝘃 𓆩 ͡꒱'
global.dev = '⚙️ ⌬ 𝙲𝚞𝚜𝚝𝚘𝚖 𝙼𝚘𝚍𝚜 𝙱𝚢 𐔌𝚗𝚎𝚟𝚒-𝚍𝚎𝚟 💻🛠️'
global.textbot = '⏤͟͞ू⃪ 𝑬𝒍𝒍𝒆𝒏-𝑱𝒐𝒆-𝑩𝒐𝒕🌸⃝𖤐 • 𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗕𝘆 ⁿᵉᵛⁱ⁻ᵈᵉᵛ'
global.etiqueta = 'ˑ 𓈒 𐔌 n͙e͙v͙i͙-d͙e͙v͙ ͡꒱ ۫'

//*─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*

global.moneda = 'Denique'
global.welcom1 = '❍ Edita Con El Comando setwelcome'
global.welcom2 = '❍ Edita Con El Comando setbye'
global.banner = 'https://raw.githubusercontent.com/The-King-Destroy/Adiciones/main/Contenido/1747289219876.jpeg'
global.avatar = 'https://qu.ax/RYjEw.jpeg'

//*─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*

global.gp1 = 'https://chat.whatsapp.com/C5mcdeiWkO8DkcCAR7GZJM'
global.comunidad1 = 'https://chat.whatsapp.com/K2CPrOTksiA36SW6k41yuR'
global.channel = 'https://whatsapp.com/channel/0029VbAuMiNCBtxOKcBfw71x'
global.channel2 = 'https://whatsapp.com/channel/0029VbAuMiNCBtxOKcBfw71x'
global.md = 'https://github.com/nevi-dev/Ellen-Joe-Bot-MD'
global.correo = 'nevijose4@gmail.com'
global.cn ='https://whatsapp.com/channel/0029VbAuMiNCBtxOKcBfw71x';

//*─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*

global.catalogo = fs.readFileSync('./src/catalogo.jpg');
global.estilo = { key: {  fromMe: false, participant: `0@s.whatsapp.net`, ...(false ? { remoteJid: "5219992095479-1625305606@g.us" } : {}) }, message: { orderMessage: { itemCount : -999999, status: 1, surface : 1, message: packname, orderTitle: 'Bang', thumbnail: catalogo, sellerJid: '0@s.whatsapp.net'}}}
global.ch = {
ch1: '120363418071540900@newsletter',
}

//*─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*

global.cheerio = cheerio
global.fs = fs
global.fetch = fetch
global.axios = axios
global.moment = moment   

global.rpg = {
  emoticon(string) {
    string = string.toLowerCase();
    const emot = {
      level: '🌟 Nivel',
      coin: '💸 Coin',
      exp: '✨ Experiencia',
      bank: '🏦 Banco',
      diamond: '💎 Diamante',
      health: '❤️ Salud',
      kyubi: '🌀 Magia',
      joincount: '💰 Token',
      emerald: '♦️ Esmeralda',
      stamina: '⚡ Energía',
      role: '⚜️ Rango',
      premium: '🎟️ Premium',
      pointxp: '📧 Puntos Exp',
      gold: '👑 Oro',
      iron: '⛓️ Hierro',
      coal: '🌑 Carbón',
      stone: '🪨 Piedra',
      potion: '🥤 Poción',
    };
    const results = Object.keys(emot).map((v) => [v, new RegExp(v, 'gi')]).filter((v) => v[1].test(string));
    if (!results.length) return '';
    else return emot[results[0][0]];
  }};
global.rpgg = { 
  emoticon(string) {
    string = string.toLowerCase();
    const emott = {
      level: '🌟',
      coin: '💸',
      exp: '✨',
      bank: '🏦',
      diamond: '💎',
      health: '❤️',
      kyubi: '🌀',
      joincount: '💰',
      emerald: '♦️',
      stamina: '⚡',
      role: '⚜️',
      premium: '🎟️',
      pointxp: '📧',
      gold: '👑',
      iron: '⛓️',
      coal: '🌑',
      stone: '🪨',
      potion: '🥤',
    };
    const results = Object.keys(emott).map((v) => [v, new RegExp(v, 'gi')]).filter((v) => v[1].test(string));
    if (!results.length) return '';
    else return emott[results[0][0]];
  }};  

//*─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.redBright("Update 'settings.js'"))
  import(`${file}?update=${Date.now()}`)
})
