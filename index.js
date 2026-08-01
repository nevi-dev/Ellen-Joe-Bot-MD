process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1'
import './settings.js'
import { setupMaster, fork } from 'cluster'
import { watchFile, unwatchFile } from 'fs'
import cfonts from 'cfonts'
import {createRequire} from 'module'
import {fileURLToPath, pathToFileURL} from 'url'
import {platform} from 'process'
import * as ws from 'ws'
import fs, {readdirSync, existsSync, mkdirSync, readFileSync, rmSync, watch} from 'fs'
import yargs from 'yargs';
import {spawn} from 'child_process'
import lodash from 'lodash'
import { EllenJadiBot } from './plugins/jadibot-serbot.js';
import chalk from 'chalk'
import syntaxerror from 'syntax-error'
import {tmpdir} from 'os'
import {format} from 'util'
import {monitorEventLoopDelay} from 'perf_hooks'
import boxen from 'boxen'
import P from 'pino'
import pino from 'pino'
import Pino from 'pino'
import path, { join, dirname } from 'path'
import {Boom} from '@hapi/boom'
import {makeWASocket, protoType, serialize} from './lib/simple.js'
import {Low} from 'lowdb'
import BetterSQLiteAdapter from './lib/sqliteDB.js'
import cloudDBAdapter from './lib/cloudDBAdapter.js'
import {mongoDB, mongoDBV2} from './lib/mongoDB.js'
import store from './lib/store.js'
import pkg from 'google-libphonenumber'
const { PhoneNumberUtil } = pkg
const phoneUtil = PhoneNumberUtil.getInstance()
const {DisconnectReason, useSqliteAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, jidNormalizedUser} = await import('baileys')
import readline, { createInterface } from 'readline'
const {CONNECTING} = ws
const {chain} = lodash
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000

//const yuw = dirname(fileURLToPath(import.meta.url))
//let require = createRequire(megu)
let { say } = cfonts


process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1'

// ASCII Art representando a Ellen-Joe
console.log(chalk.cyan(`

                                     @@.
                                     @@,
                                     @@,
                                   @@@%
                                 @@@@@,
                             @@@@@@@.
                         #@@@@@@@@,
                       @@@@@@@@@
                    ,@@@@@@@@@@
                  &@@@@@@@@@@@
                @@@@@@@@@@@@@
          %@@@@@@@@@@@@@@@@
        @@@@@@@@@@@@@@@@@@
       @@@@@@@@@@@@@@@@@@@
      @@@@@@@@@@@@@@@@@@@@@
     @@@@@@@@@@@@@@@@@@@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@#
   @@@@@@@@@@@@@@@@@@@@@@@@@@* #@@@@@@@@@@@@@@@@@@@@@@@@@@@
  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@
  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
   @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@,
    .@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
       /@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@* &@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@,
              %@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
`))

cfonts.say('Ellen-Joe Bot', {
  font: 'chrome',
  align: 'center',
  gradient: ['#00FFFF', '#8A2BE2'], // Colores cyberpunk: Cian y Azul-Violeta
  transition: true,
  env: 'node'
})

// Créditos
cfonts.say('Adaptado para Ellen-Joe por: Nevi-dev', {
  font: 'console',
  align: 'center',
  colors: ['cyan']
})

console.log(chalk.magentaBright('═════════════════════════════════════════════════════════════════════'))
console.log(chalk.cyanBright('          🚀 Bienvenido al núcleo del Bot Ellen-Joe 🚀'))
console.log(chalk.whiteBright('  Iniciando sistemas... Ellen está lista para ayudarte en tu próximo encargo ✨'))
console.log(chalk.magentaBright('═════════════════════════════════════════════════════════════════════\n'))

protoType()
serialize()

global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
return rmPrefix ? /file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL : pathToFileURL(pathURL).toString();
}; global.__dirname = function dirname(pathURL) {
return path.dirname(global.__filename(pathURL, true))
}; global.__require = function require(dir = import.meta.url) {
return createRequire(dir)
}

global.API = (name, path = '/', query = {}, apikeyqueryname) => (name in global.APIs ? global.APIs[name] : name) + path + (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({...query, ...(apikeyqueryname ? {[apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name]} : {})})) : '');

global.timestamp = {start: new Date}

const __dirname = global.__dirname(import.meta.url)

global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
global.prefix = new RegExp('^[#/!.]')
// global.opts['db'] = process.env['db']

global.db = new Low(/https?:\/\//.test(opts['db'] || '') ? new cloudDBAdapter(opts['db']) : new BetterSQLiteAdapter('./src/database/database.sqlite', { migrateFrom: './src/database/database.json' }))

global.DATABASE = global.db
global.loadDatabase = async function loadDatabase() {
  // 1. Mejoramos la validación inicial para evitar que pase de largo si data es undefined
  if (global.db.data && Object.keys(global.db.data).length > 0) return global.db.data
  if (global.db.READ) return global.db.READ

  global.db.READ = (async () => {
    await global.db.read().catch(console.error)
    global.db.data = {
      users: {},
      chats: {},
      stats: {},
      msgs: {},
      sticker: {},
      settings: {},
      ...(global.db.data || {}),
    }
    global.db.chain = chain(global.db.data)
    global.db.READ = null
    return global.db.data
  })()
  return global.db.READ
}

// 2. Agregamos el await fundamental aquí:
await loadDatabase()

if (!fs.existsSync(global.Ellensessions)) fs.mkdirSync(global.Ellensessions, { recursive: true })
// Bails: la sesión principal usa SQLite y vive exclusivamente dentro de ./src/database/.
const sessionDir = path.join(global.Ellensessions || 'EllenSessions')
if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true })
const sessionDbPath = path.join(sessionDir, 'sesion.db')
const {version} = await fetchLatestBaileysVersion();
let phoneNumber = global.botNumber

const methodCodeQR = process.argv.includes("qr")
const methodCode = !!phoneNumber || process.argv.includes("code")
const MethodMobile = process.argv.includes("mobile")
const colores = chalk.bgCyan.black
const opcionQR = chalk.bold.green
const opcionTexto = chalk.bold.blue
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (texto) => new Promise((resolver) => rl.question(texto, resolver))

let opcion
if (methodCodeQR) {
opcion = '1'
}
if (!methodCodeQR && !methodCode && !fs.existsSync(sessionDbPath)) {
do {
opcion = await question(colores('⌨ Seleccione una opción:\n') + opcionQR('1. Con código QR\n') + opcionTexto('2. Con código de texto de 8 dígitos\n--> '))

if (!/^[1-2]$/.test(opcion)) {
console.log(chalk.bold.redBright(`✦ Solo se permiten los números 1 o 2. No se admiten letras ni símbolos especiales.`))
}} while (opcion !== '1' && opcion !== '2' || fs.existsSync(sessionDbPath))
}

console.info = () => {}
console.debug = () => {}

const BROWSER_FINGERPRINTS = [
    // Windows 11 / 10
    ['Windows', 'Chrome', '150.0.0.0'],
    ['Windows', 'Edge', '150.0.0.0'],
    ['Windows', 'Firefox', '154.0'],
    ['Windows', 'Opera', '116.0.0.0'],
    
    // macOS
    ['Mac OS', 'Safari', '19.5'],
    ['Mac OS', 'Chrome', '150.0.0.0'],
    ['Mac OS', 'Edge', '150.0.0.0'],
    ['Mac OS', 'Firefox', '154.0'],
    
    // Linux
    ['Ubuntu', 'Chrome', '149.0.0.0'],
    ['Ubuntu', 'Firefox', '153.0'],
    ['Debian', 'Chrome', '149.0.0.0'],
    ['Linux', 'Edge', '149.0.0.0']
];

const getRandomBrowser = () => BROWSER_FINGERPRINTS[Math.floor(Math.random() * BROWSER_FINGERPRINTS.length)]
global.BROWSER_FINGERPRINTS = BROWSER_FINGERPRINTS
global.getRandomBrowser = getRandomBrowser

// IMPORTANTE: esperar a que useSqliteAuthState termine de abrir/cargar SQLite antes de crear el socket.
const {state, saveCreds} = await useSqliteAuthState({ dbPath: sessionDbPath })

const connectionOptions = {
logger: pino({ level: 'silent' }),
printQRInTerminal: opcion == '1' ? true : methodCodeQR ? true : false,
mobile: MethodMobile,
browser: getRandomBrowser(),
auth: {
creds: state.creds,
keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: "fatal" }).child({ level: "fatal" })),
},
markOnlineOnConnect: false,
generateHighQualityLinkPreview: true,
getMessage: async (clave) => {
let jid = jidNormalizedUser(clave.remoteJid)
let msg = await store.loadMessage(jid, clave.id)
return msg?.message || ''
},
defaultQueryTimeoutMs: undefined,
version,
}


const MAIN_RECONNECT_BASE_DELAY_MS = 1500
const MAIN_RECONNECT_MAX_DELAY_MS = 15000
const MAIN_RECONNECT_FAST_CODES = new Set([500, 428, 408, 440, 515])
let mainReconnectAttempts = 0
let mainReconnectTimer = null
let mainReconnectInFlight = false
let gracefulShutdownStarted = false
const getDisconnectStatusCode = (lastDisconnect) => {
const rawError = lastDisconnect?.error || lastDisconnect
const boomError = rawError instanceof Boom ? rawError : new Boom(rawError)
return boomError?.output?.statusCode || rawError?.output?.statusCode || rawError?.statusCode || rawError?.data?.statusCode
}
const getDisconnectReasonLabel = (statusCode) => statusCode === 500 ? 'internalServerError/recoverable' : Object.entries(DisconnectReason).find(([, value]) => value === statusCode)?.[0] || 'unknown'
const getReconnectDelay = (attempt, statusCode) => {
const baseDelay = MAIN_RECONNECT_FAST_CODES.has(statusCode) ? 750 : MAIN_RECONNECT_BASE_DELAY_MS
const exponentialDelay = Math.min(baseDelay * (2 ** Math.max(attempt - 1, 0)), MAIN_RECONNECT_MAX_DELAY_MS)
const jitter = Math.floor(Math.random() * 500)
return exponentialDelay + jitter
}
const safeCloseSocket = (socket) => {
try { socket?.ws?.close?.() } catch (error) { console.error('No se pudo cerrar el WebSocket anterior:', error) }
try { socket?.ev?.removeAllListeners?.() } catch (error) { console.error('No se pudieron limpiar listeners del socket anterior:', error) }
}
const shutdown = async (signal = 'SIGTERM', exitCode = 0) => {
if (gracefulShutdownStarted) return
gracefulShutdownStarted = true
console.log(chalk.bold.yellow(`
⚠️ ${signal} recibido. Guardando store y cerrando proceso...`))
try {
store.writeToFile?.('./src/database/store.json')
} catch (error) {
console.error('No se pudo guardar el store antes de cerrar:', error)
}
setTimeout(() => process.exit(exitCode), 250).unref?.()
}
process.once('SIGINT', () => shutdown('SIGINT', 0))
process.once('SIGTERM', () => shutdown('SIGTERM', 0))

global.conn = makeWASocket(connectionOptions);

if (opcion === '2' || methodCode) {
opcion = '2'
if (!conn.authState.creds.registered) {
let addNumber
if (!!phoneNumber) {
addNumber = phoneNumber.replace(/[^0-9]/g, '')
} else {
do {
phoneNumber = await question(chalk.bgBlack(chalk.bold.greenBright(`✦ Por favor, ingrese el número de WhatsApp.\n${chalk.bold.yellowBright(`✏️  Ejemplo: 1234567890`)}\n${chalk.bold.magentaBright('---> ')}`)))
phoneNumber = phoneNumber.replace(/\D/g,'')
if (!phoneNumber.startsWith('+')) {
phoneNumber = `+${phoneNumber}`
}
} while (!await isValidPhoneNumber(phoneNumber))
rl.close()
addNumber = phoneNumber.replace(/\D/g, '')
setTimeout(async () => {
let codeBot = await conn.requestPairingCode(addNumber)
codeBot = codeBot?.match(/.{1,4}/g)?.join("-") || codeBot
console.log(chalk.bold.white(chalk.bgMagenta(`✧ CÓDIGO DE VINCULACIÓN ✧`)), chalk.bold.white(chalk.white(codeBot)))
}, 3000)
}}}

conn.isInit = false;
conn.well = false;
//conn.logger.info(`✦  H E C H O\n`)

if (!opts['test']) {
if (global.db) setInterval(async () => {
if (global.db.data) await global.db.write()
if (opts['autocleartmp'] && (global.support || {}).find) (tmp = [os.tmpdir(), 'tmp', `${jadi}`], tmp.forEach((filename) => cp.spawn('find', [filename, '-amin', '3', '-type', 'f', '-delete'])));
}, 30 * 1000);
}

// if (opts['server']) (await import('./server.js')).default(global.conn, PORT);

async function connectionUpdate(update) {
const {connection, lastDisconnect, isNewLogin} = update;
global.stopped = connection;
if (isNewLogin) conn.isInit = true;
if (global.db.data == null) loadDatabase();
if (update.qr != 0 && update.qr != undefined || methodCodeQR) {
if (opcion == '1' || methodCodeQR) {
console.log(chalk.bold.yellow(`
❐ ESCANEA EL CÓDIGO QR, EXPIRA EN 45 SEGUNDOS`))}
}
if (connection == 'open') {
mainReconnectAttempts = 0
mainReconnectInFlight = false
if (mainReconnectTimer) {
clearTimeout(mainReconnectTimer)
mainReconnectTimer = null
}
console.log(chalk.bold.green('\n❀ Ellen-Bot Conectado Exitosamente ❀'))
}

if (connection === 'close') {
const statusCode = getDisconnectStatusCode(lastDisconnect)
const isLoggedOut = statusCode === DisconnectReason.loggedOut
const reasonLabel = getDisconnectReasonLabel(statusCode)

if (isLoggedOut) {
console.log(chalk.bold.redBright(`
╭─「 SESIÓN CERRADA 」
│ WhatsApp devolvió Logged Out (${statusCode}).
│ No se intentará reconectar automáticamente; vuelve a vincular la sesión.
╰────────────────────`))
return
}

if (mainReconnectTimer || mainReconnectInFlight) {
console.log(chalk.bold.yellowBright(`⚠️ Ya hay una reconexión principal programada/en curso. Código recibido: ${statusCode || 'No Encontrado'} (${reasonLabel}).`))
return
}

mainReconnectAttempts += 1
const delayMs = getReconnectDelay(mainReconnectAttempts, statusCode)
const recoverableReason = statusCode === 500 || statusCode === DisconnectReason.connectionClosed || statusCode === DisconnectReason.connectionLost || statusCode === DisconnectReason.timedOut || statusCode === DisconnectReason.restartRequired

console.log(chalk.bold.yellowBright(`
╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ▸
┆ ⚠️ CONEXIÓN CERRADA (${statusCode || 'No Encontrado'} / ${reasonLabel}).
┆ ${recoverableReason ? 'Error recuperable detectado' : 'Se tratará como recuperable mientras no sea Logged Out'}.
┆ Reintentando en ${Math.round(delayMs / 1000)}s sin matar el proceso de Node...
╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ▸`))

mainReconnectTimer = setTimeout(async () => {
mainReconnectTimer = null
mainReconnectInFlight = true
try {
await global.reloadHandler(true)
global.timestamp.connect = new Date
} catch (error) {
console.error('Error al reconectar el socket principal:', error)
} finally {
mainReconnectInFlight = false
}
}, delayMs)
mainReconnectTimer.unref?.()
}
}

process.on('uncaughtException', (error) => {
console.error('⚠️ Excepción no capturada; el proceso seguirá vivo para permitir reconexión:', error)
})
process.on('unhandledRejection', (reason) => {
console.error('⚠️ Promesa rechazada no manejada; el proceso seguirá vivo para permitir reconexión:', reason)
})

let isInit = true;
let handler = await import('./handler.js')
global.reloadHandler = async function(restatConn) {
try {
const Handler = await import(`./handler.js?update=${Date.now()}`).catch(console.error);
if (Object.keys(Handler || {}).length) handler = Handler
} catch (e) {
console.error(e);
}
if (restatConn) {
const oldChats = global.conn.chats
safeCloseSocket(global.conn)
global.conn = makeWASocket(connectionOptions, {chats: oldChats})
isInit = true
}
if (!isInit) {
conn.ev.off('messages.upsert', conn.handler)
conn.ev.off('connection.update', conn.connectionUpdate)
conn.ev.off('creds.update', conn.credsUpdate)
}

const boundMainHandler = handler.handler.bind(global.conn)
conn.handler = async (chatUpdate) => {
try {
return await boundMainHandler(chatUpdate)
} catch (error) {
console.error('⚠️ Error interno manejando mensaje principal; el proceso seguirá vivo:', error)
}
}

global.dispatchCommandFromButton = async (fakeMessage) => {
  try {
    await handler.handler.call(conn, { messages: [fakeMessage] })
  } catch (err) {
    console.error("❌ Error al ejecutar comando desde botón:", err)
  }
}
conn.connectionUpdate = connectionUpdate.bind(global.conn)
conn.credsUpdate = saveCreds.bind(global.conn, true)

conn.ev.on('messages.upsert', conn.handler)
conn.ev.on('connection.update', conn.connectionUpdate)
conn.ev.on('creds.update', conn.credsUpdate)
isInit = false
return true
};

//Arranque nativo para sub-bots por - ReyEndymion >> https://github.com/ReyEndymion

// Sub-bots/Jadibots: sus bases SQLite también quedan bajo ./src/database/.
global.rutaJadiBot = join(__dirname, './src/database', global.jadi || 'EllenJadiBots')

if (global.EllenJadibts) {
if (!existsSync(global.rutaJadiBot)) {
mkdirSync(global.rutaJadiBot, { recursive: true })
console.log(chalk.bold.cyan(`La carpeta: ${jadi} se creó correctamente.`))
} else {
console.log(chalk.bold.cyan(`La carpeta: ${jadi} ya está creada.`))
}

const readRutaJadiBot = readdirSync(rutaJadiBot)
if (readRutaJadiBot.length > 0) {
const sessionDb = 'sesion.db'
for (const gjbts of readRutaJadiBot) {
const botPath = join(rutaJadiBot, gjbts)
const readBotPath = readdirSync(botPath)
if (readBotPath.includes(sessionDb)) {
EllenJadiBot({pathEllenJadiBot: botPath, m: null, conn, args: '', usedPrefix: '/', command: 'serbot'})
}
}
}
}

const pluginFolder = global.__dirname(join(__dirname, './plugins/index'))
const pluginFilter = (filename) => /\.js$/.test(filename)
global.plugins = {}
global.pluginsVersion = 0
async function filesInit() {
for (const filename of readdirSync(pluginFolder).filter(pluginFilter)) {
try {
const file = global.__filename(join(pluginFolder, filename))
const module = await import(file)
global.plugins[filename] = module.default || module
global.pluginsVersion++
} catch (e) {
conn.logger.error(e)
delete global.plugins[filename]
}}}
filesInit().then((_) => Object.keys(global.plugins)).catch(console.error);

global.reload = async (_ev, filename) => {
if (pluginFilter(filename)) {
const dir = global.__filename(join(pluginFolder, filename), true);
if (filename in global.plugins) {
if (existsSync(dir)) conn.logger.info(` plugin actualizado - '${filename}'`)
else {
conn.logger.warn(` plugin eliminado - '${filename}'`)
global.pluginsVersion++
return delete global.plugins[filename]
}} else conn.logger.info(`nuevo plugin - '${filename}'`);
const err = syntaxerror(readFileSync(dir), filename, {
sourceType: 'module',
allowAwaitOutsideFunction: true,
});
if (err) conn.logger.error(`error de sintaxis al cargar '${filename}'\n${format(err)}`)
else {
try {
const module = (await import(`${global.__filename(dir)}?update=${Date.now()}`));
global.plugins[filename] = module.default || module;
global.pluginsVersion++
} catch (e) {
conn.logger.error(`error al requerir el plugin '${filename}\n${format(e)}'`)
} finally {
global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)))
}}
}}
Object.freeze(global.reload)
const pluginReloadTimers = new Map()
watch(pluginFolder, (event, filename) => {
if (!filename) return
clearTimeout(pluginReloadTimers.get(filename))
const timer = setTimeout(() => {
pluginReloadTimers.delete(filename)
global.reload(event, filename)
}, 300)
timer.unref?.()
pluginReloadTimers.set(filename, timer)
})
await global.reloadHandler()
async function _quickTest() {
const test = await Promise.all([
spawn('ffmpeg'),
spawn('ffprobe'),
spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-filter_complex', 'color', '-frames:v', '1', '-f', 'webp', '-']),
spawn('convert'),
spawn('magick'),
spawn('gm'),
spawn('find', ['--version']),
].map((p) => {
return Promise.race([
new Promise((resolve) => {
p.on('close', (code) => {
resolve(code !== 127);
});
}),
new Promise((resolve) => {
p.on('error', (_) => resolve(false));
})]);
}));
const [ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find] = test;
const s = global.support = {ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find};
Object.freeze(global.support);
}

async function safeReadDir(dir) {
try {
return await fs.promises.readdir(dir)
} catch (error) {
if (error?.code !== 'ENOENT') console.error(`No se pudo leer el directorio ${dir}:`, error)
return []
}
}

async function safeUnlink(filePath) {
try {
await fs.promises.unlink(filePath)
return true
} catch (error) {
if (error?.code !== 'ENOENT') console.error(`No se pudo eliminar ${filePath}:`, error)
return false
}
}

async function clearTmp() {
const tmpDir = join(__dirname, 'tmp')
const filenames = await safeReadDir(tmpDir)
await Promise.all(filenames.map(file => safeUnlink(join(tmpDir, file))))
}

function redefineConsoleMethod(methodName, filterStrings) {
const originalConsoleMethod = console[methodName]
console[methodName] = function() {
const message = arguments[0]
if (typeof message === 'string' && filterStrings.some(filterString => message.includes(atob(filterString)))) {
arguments[0] = ""
}
originalConsoleMethod.apply(console, arguments)
}}

setInterval(async () => {
if (stopped === 'close' || !conn || !conn.user) return
await clearTmp()
console.log(chalk.bold.cyanBright(`\n╭» ❍ MULTIMEDIA ❍\n│→ ARCHIVOS DE LA CARPETA TMP ELIMINADOS\n╰― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ⌫ ♻`))}, 1000 * 60 * 4) // 4 min

_quickTest().then(() => conn.logger.info(chalk.bold(`✦  H E C H O\n`.trim()))).catch(console.error)

async function isValidPhoneNumber(number) {
try {
number = number.replace(/\s+/g, '')
if (number.startsWith('+521')) {
number = number.replace('+521', '+52');
} else if (number.startsWith('+52') && number[4] === '1') {
number = number.replace('+52 1', '+52');
}
const parsedNumber = phoneUtil.parseAndKeepRawInput(number)
return phoneUtil.isValidNumber(parsedNumber)
} catch (error) {
return false
}}
