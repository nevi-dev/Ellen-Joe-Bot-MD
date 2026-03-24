process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1'
import './settings.js'
import { watchFile, unwatchFile, readdirSync, statSync, unlinkSync, existsSync, mkdirSync, readFileSync, watch } from 'fs'
import fs from 'fs'
import path, { join, dirname } from 'path'
import { createRequire } from 'module'
import { fileURLToPath, pathToFileURL } from 'url'
import { platform } from 'process'
import { spawn } from 'child_process'
import { tmpdir } from 'os'
import * as ws from 'ws'
import yargs from 'yargs'
import lodash from 'lodash'
import chalk from 'chalk'
import cfonts from 'cfonts'
import syntaxerror from 'syntax-error'
import { format } from 'util'
import pino from 'pino'
import { Boom } from '@hapi/boom'
import { Low, JSONFile } from 'lowdb'
import readline from 'readline'
import NodeCache from 'node-cache'
import pkg from 'google-libphonenumber'

// Importaciones locales y de Baileys
import { makeWASocket, protoType, serialize } from './lib/simple.js'
import { mongoDB, mongoDBV2 } from './lib/mongoDB.js'
import store from './lib/store.js'
import { EllenJadiBot } from './plugins/jadibot-serbot.js'
// import { checkCodesEndpoint } from './lib/apiChecker.js';

const { PhoneNumberUtil } = pkg
const phoneUtil = PhoneNumberUtil.getInstance()
const { proto } = (await import('@whiskeysockets/baileys')).default
const { DisconnectReason, useMultiFileAuthState, MessageRetryMap, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, jidNormalizedUser } = await import('@whiskeysockets/baileys')

const { chain } = lodash
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000

// --- ESTÉTICA Y ARRANQUE ---
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
  gradient: ['#00FFFF', '#8A2BE2'], 
  transition: true,
  env: 'node'
})

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

// --- CONFIGURACIÓN GLOBAL ---
global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
    return rmPrefix ? /file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL : pathToFileURL(pathURL).toString();
}; 
global.__dirname = function dirname(pathURL) {
    return path.dirname(global.__filename(pathURL, true))
}; 
global.__require = function require(dir = import.meta.url) {
    return createRequire(dir)
}

global.API = (name, path = '/', query = {}, apikeyqueryname) => (name in global.APIs ? global.APIs[name] : name) + path + (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({...query, ...(apikeyqueryname ? {[apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name]} : {})})) : '');

global.timestamp = {start: new Date}
const __dirname = global.__dirname(import.meta.url)
global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
global.prefix = new RegExp('^[#/!.]')

// --- BASE DE DATOS ---
global.db = new Low(/https?:\/\//.test(opts['db'] || '') ? new cloudDBAdapter(opts['db']) : new JSONFile('./src/database/database.json'))
global.DATABASE = global.db

global.loadDatabase = async function loadDatabase() {
    if (global.db.READ) {
        return new Promise((resolve) => setInterval(async function() {
            if (!global.db.READ) {
                clearInterval(this)
                resolve(global.db.data == null ? global.loadDatabase() : global.db.data);
            }
        }, 1 * 1000))
    }
    if (global.db.data !== null) return
    global.db.READ = true
    await global.db.read().catch(console.error)
    global.db.READ = null
    global.db.data = {
        users: {}, chats: {}, stats: {}, msgs: {}, sticker: {}, settings: {},
        ...(global.db.data || {}),
    }
    global.db.chain = chain(global.db.data)
}
loadDatabase()

// --- AUTENTICACIÓN Y OPCIONES ---
const {state, saveState, saveCreds} = await useMultiFileAuthState(global.Ellensessions || 'sessions')
const msgRetryCounterMap = (MessageRetryMap) => { };
const msgRetryCounterCache = new NodeCache()
const {version} = await fetchLatestBaileysVersion();
let phoneNumber = global.botNumber

const methodCodeQR = process.argv.includes("qr")
const methodCode = !!phoneNumber || process.argv.includes("code")
const MethodMobile = process.argv.includes("mobile")
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (texto) => new Promise((resolver) => rl.question(texto, resolver))

let opcion
if (methodCodeQR) opcion = '1'

if (!methodCodeQR && !methodCode && !existsSync(`./${global.Ellensessions || 'sessions'}/creds.json`)) {
    do {
        opcion = await question(chalk.bgCyan.black('⌨ Seleccione una opción:\n') + chalk.bold.green('1. Con código QR\n') + chalk.bold.blue('2. Con código de texto de 8 dígitos\n--> '))
        if (!/^[1-2]$/.test(opcion)) {
            console.log(chalk.bold.redBright(`✦ Solo se permiten los números 1 o 2. No se admiten letras ni símbolos especiales.`))
        }
    } while (opcion !== '1' && opcion !== '2' || existsSync(`./${global.Ellensessions || 'sessions'}/creds.json`))
}

const connectionOptions = {
    logger: pino({ level: 'silent' }),
    printQRInTerminal: opcion == '1' ? true : methodCodeQR ? true : false,
    mobile: MethodMobile,
    browser: opcion == '1' ? [global.nameqr || 'Ellen', 'Edge', '20.0.04'] : methodCodeQR ? [global.nameqr || 'Ellen', 'Edge', '20.0.04'] : ['Ubuntu', 'Edge', '110.0.1587.56'],
    auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
    },
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false, // OPTIMIZADO: Evita crasheos de RAM
    getMessage: async (clave) => {
        let jid = jidNormalizedUser(clave.remoteJid)
        let msg = await store.loadMessage(jid, clave.id)
        return msg?.message || ""
    },
    msgRetryCounterCache,
    msgRetryCounterMap,
    defaultQueryTimeoutMs: undefined,
    version,
}

global.conn = makeWASocket(connectionOptions);

if (!existsSync(`./${global.Ellensessions || 'sessions'}/creds.json`)) {
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
                    if (!phoneNumber.startsWith('+')) phoneNumber = `+${phoneNumber}`
                } while (!await isValidPhoneNumber(phoneNumber))
                rl.close()
                addNumber = phoneNumber.replace(/\D/g, '')
                setTimeout(async () => {
                    let codeBot = await conn.requestPairingCode(addNumber)
                    codeBot = codeBot?.match(/.{1,4}/g)?.join("-") || codeBot
                    console.log(chalk.bold.white(chalk.bgMagenta(`✧ CÓDIGO DE VINCULACIÓN ✧`)), chalk.bold.white(chalk.white(codeBot)))
                }, 3000)
            }
        }
    }
}

conn.isInit = false;
conn.well = false;

if (!opts['test']) {
    if (global.db) setInterval(async () => {
        if (global.db.data) await global.db.write()
        if (opts['autocleartmp'] && (global.support || {}).find) {
            let tmpDirs = [tmpdir(), 'tmp', global.jadi || 'jadibts']
            tmpDirs.forEach((dir) => spawn('find', [dir, '-amin', '3', '-type', 'f', '-delete']))
        }
    }, 30 * 1000);
}

// --- GESTIÓN DE EVENTOS DE CONEXIÓN ---
async function connectionUpdate(update) {
    const {connection, lastDisconnect, isNewLogin} = update;
    global.stopped = connection;
    if (isNewLogin) conn.isInit = true;
    
    const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode;
    if (code && code !== DisconnectReason.loggedOut && conn?.ws.socket == null) {
        await global.reloadHandler(true).catch(console.error);
        global.timestamp.connect = new Date;
    }
    
    if (global.db.data == null) loadDatabase();
    
    if (update.qr != 0 && update.qr != undefined || methodCodeQR) {
        if (opcion == '1' || methodCodeQR) {
            console.log(chalk.bold.yellow(`\n❐ ESCANEA EL CÓDIGO QR, EXPIRA EN 45 SEGUNDOS`))
        }
    }
    
    if (connection == 'open') {
        console.log(chalk.bold.green('\n❀ Ellen-Bot Conectado Exitosamente ❀'))
    }

    let reason = new Boom(lastDisconnect?.error)?.output?.statusCode
    if (connection === 'close') {
        if (reason === DisconnectReason.badSession) {
            console.log(chalk.bold.cyanBright(`\n⚠️ SIN CONEXIÓN, BORRE LA CARPETA ${global.Ellensessions} Y ESCANEE EL CÓDIGO QR ⚠️`))
        } else if (reason === DisconnectReason.connectionClosed) {
            console.log(chalk.bold.magentaBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ☹\n┆ ⚠️ CONEXIÓN CERRADA, RECONECTANDO....\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ☹`))
            await global.reloadHandler(true).catch(console.error)
        } else if (reason === DisconnectReason.connectionLost) {
            console.log(chalk.bold.blueBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ☂\n┆ ⚠️ CONEXIÓN PERDIDA CON EL SERVIDOR, RECONECTANDO....\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ☂`))
            await global.reloadHandler(true).catch(console.error)
        } else if (reason === DisconnectReason.connectionReplaced) {
            console.log(chalk.bold.yellowBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ✗\n┆ ⚠️ CONEXIÓN REEMPLAZADA, SE HA ABIERTO OTRA NUEVA SESIÓN.\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ✗`))
        } else if (reason === DisconnectReason.loggedOut) {
            console.log(chalk.bold.redBright(`\n⚠️ SIN CONEXIÓN, BORRE LA CARPETA ${global.Ellensessions} Y ESCANEE EL CÓDIGO QR ⚠️`))
            await global.reloadHandler(true).catch(console.error)
        } else if (reason === DisconnectReason.restartRequired) {
            console.log(chalk.bold.cyanBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ✓\n┆ ✧ CONECTANDO AL SERVIDOR...\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ✓`))
            await global.reloadHandler(true).catch(console.error)
        } else if (reason === DisconnectReason.timedOut) {
            console.log(chalk.bold.yellowBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ▸\n┆ ⧖ TIEMPO DE CONEXIÓN AGOTADO, RECONECTANDO....\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ▸`))
            await global.reloadHandler(true).catch(console.error)
        } else {
            console.log(chalk.bold.redBright(`\n⚠️！ RAZÓN DE DESCONEXIÓN DESCONOCIDA: ${reason || 'No Encontrado'} >> ${connection || 'No Encontrado'}`))
        }
    }
}
process.on('uncaughtException', console.error)

// --- SISTEMA DE PLUGINS Y RECARGA ---
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
        try { global.conn.ws.close() } catch { }
        conn.ev.removeAllListeners()
        global.conn = makeWASocket(connectionOptions, {chats: oldChats})
        isInit = true
    }
    if (!isInit) {
        conn.ev.off('messages.upsert', conn.handler)
        conn.ev.off('connection.update', conn.connectionUpdate)
        conn.ev.off('creds.update', conn.credsUpdate)
    }

    conn.handler = handler.handler.bind(global.conn)
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

// --- ARRANQUE NATIVO DE SUB-BOTS ---
global.rutaJadiBot = join(__dirname, `./${global.jadi || 'EllenJadiBots'}`)
if (global.EllenJadibts) {
    if (!existsSync(global.rutaJadiBot)) {
        mkdirSync(global.rutaJadiBot, { recursive: true })
        console.log(chalk.bold.cyan(`La carpeta: ${global.jadi || 'EllenJadiBots'} se creó correctamente.`))
    }

    const readRutaJadiBot = readdirSync(global.rutaJadiBot)
    if (readRutaJadiBot.length > 0) {
        for (const gjbts of readRutaJadiBot) {
            const botPath = join(global.rutaJadiBot, gjbts)
            if (existsSync(join(botPath, 'creds.json'))) {
                EllenJadiBot({pathEllenJadiBot: botPath, m: null, conn, args: '', usedPrefix: '/', command: 'serbot'})
            }
        }
    }
}

// --- VISOR DE PLUGINS ---
const pluginFolder = global.__dirname(join(__dirname, './plugins/index'))
const pluginFilter = (filename) => /\.js$/.test(filename)
global.plugins = {}
async function filesInit() {
    for (const filename of readdirSync(pluginFolder).filter(pluginFilter)) {
        try {
            const file = global.__filename(join(pluginFolder, filename))
            const module = await import(file)
            global.plugins[filename] = module.default || module
        } catch (e) {
            conn.logger.error(e)
            delete global.plugins[filename]
        }
    }
}
filesInit().then((_) => Object.keys(global.plugins)).catch(console.error);

global.reload = async (_ev, filename) => {
    if (pluginFilter(filename)) {
        const dir = global.__filename(join(pluginFolder, filename), true);
        if (filename in global.plugins) {
            if (existsSync(dir)) conn.logger.info(` plugin actualizado - '${filename}'`)
            else {
                conn.logger.warn(` plugin eliminado - '${filename}'`)
                return delete global.plugins[filename]
            }
        } else conn.logger.info(`nuevo plugin - '${filename}'`);
        
        const err = syntaxerror(readFileSync(dir), filename, { sourceType: 'module', allowAwaitOutsideFunction: true });
        if (err) conn.logger.error(`error de sintaxis al cargar '${filename}'\n${format(err)}`)
        else {
            try {
                const module = (await import(`${global.__filename(dir)}?update=${Date.now()}`));
                global.plugins[filename] = module.default || module;
            } catch (e) {
                conn.logger.error(`error al requerir el plugin '${filename}\n${format(e)}'`)
            } finally {
                global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)))
            }
        }
    }
}
Object.freeze(global.reload)
watch(pluginFolder, global.reload)
await global.reloadHandler()

// --- FUNCIONES UTILITARIAS Y DE LIMPIEZA ---
async function _quickTest() {
    const test = await Promise.all([
        spawn('ffmpeg'), spawn('ffprobe'),
        spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-filter_complex', 'color', '-frames:v', '1', '-f', 'webp', '-']),
        spawn('convert'), spawn('magick'), spawn('gm'), spawn('find', ['--version']),
    ].map((p) => {
        return Promise.race([
            new Promise((resolve) => { p.on('close', (code) => { resolve(code !== 127); }); }),
            new Promise((resolve) => { p.on('error', (_) => resolve(false)); })
        ]);
    }));
    const [ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find] = test;
    const s = global.support = {ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find};
    Object.freeze(global.support);
}

function clearTmp() {
    const tmpDir = join(__dirname, 'tmp')
    if (existsSync(tmpDir)) {
        readdirSync(tmpDir).forEach(file => unlinkSync(join(tmpDir, file)))
    }
}

function purgeEllenSession() {
    const sessionDir = `./${global.Ellensessions || 'sessions'}`
    if (existsSync(sessionDir)) {
        readdirSync(sessionDir).filter(f => f.startsWith('pre-key-')).forEach(f => unlinkSync(join(sessionDir, f)))
    }
}

function purgeEllenSessionSB() {
    const jadiDir = `./${global.jadi || 'EllenJadiBots'}/`
    let hasDeleted = false;
    try {
        if (!existsSync(jadiDir)) return
        readdirSync(jadiDir).forEach(directorio => {
            const dirPath = join(jadiDir, directorio)
            if (statSync(dirPath).isDirectory()) {
                readdirSync(dirPath).filter(f => f.startsWith('pre-key-')).forEach(f => {
                    if (f !== 'creds.json') {
                        unlinkSync(join(dirPath, f))
                        hasDeleted = true
                    }
                })
            }
        })
        if (!hasDeleted) {
            console.log(chalk.bold.green(`\n╭» ❍ ${global.jadi || 'EllenJadiBots'} ❍\n│→ NADA POR ELIMINAR \n╰― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ⌫ ♻︎`))
        } else {
            console.log(chalk.bold.cyanBright(`\n╭» ❍ ${global.jadi || 'EllenJadiBots'} ❍\n│→ ARCHIVOS NO ESENCIALES ELIMINADOS\n╰― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ⌫ ♻︎︎`))
        }
    } catch (err) {
        console.log(chalk.bold.red(`\n╭» ❍ ${global.jadi || 'EllenJadiBots'} ❍\n│→ OCURRIÓ UN ERROR\n╰― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ⌫ ♻\n` + err))
    }
}

function purgeOldFiles() {
    const directories = [`./${global.Ellensessions || 'sessions'}/`, `./${global.jadi || 'EllenJadiBots'}/`]
    directories.forEach(dir => {
        if (existsSync(dir)) {
            readdirSync(dir).forEach(file => {
                if (file !== 'creds.json') {
                    try {
                        unlinkSync(path.join(dir, file));
                        console.log(chalk.bold.green(`\n╭» ❍ ARCHIVO ❍\n│→ ${file} BORRADO CON ÉXITO\n╰― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ⌫ ♻`))
                    } catch (err) {
                        console.log(chalk.bold.red(`\n╭» ❍ ARCHIVO ❍\n│→ ${file} NO SE LOGRÓ BORRAR\n╰― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ⌫ ✘\n` + err))
                    }
                }
            })
        }
    })
}

function redefineConsoleMethod(methodName, filterStrings) {
    const originalConsoleMethod = console[methodName]
    console[methodName] = function() {
        const message = arguments[0]
        if (typeof message === 'string' && filterStrings.some(filterString => message.includes(atob(filterString)))) {
            arguments[0] = ""
        }
        originalConsoleMethod.apply(console, arguments)
    }
}

// --- INTERVALOS DE MANTENIMIENTO ---
setInterval(async () => {
    if (global.stopped === 'close' || !conn || !conn.user) return
    clearTmp()
    console.log(chalk.bold.cyanBright(`\n╭» ❍ MULTIMEDIA ❍\n│→ ARCHIVOS DE LA CARPETA TMP ELIMINADOS\n╰― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ⌫ ♻`))
}, 1000 * 60 * 4)

setInterval(async () => {
    if (global.stopped === 'close' || !conn || !conn.user) return
    purgeEllenSession()
    console.log(chalk.bold.cyanBright(`\n╭» ❍ ${global.Ellensessions || 'sessions'} ❍\n│→ SESIONES NO ESENCIALES ELIMINADAS\n╰― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ⌫ ♻`))
}, 1000 * 60 * 10)

setInterval(async () => {
    if (global.stopped === 'close' || !conn || !conn.user) return
    purgeEllenSessionSB()
}, 1000 * 60 * 10)

setInterval(async () => {
    if (global.stopped === 'close' || !conn || !conn.user) return
    purgeOldFiles();
    console.log(chalk.bold.cyanBright(`\n╭» ❍ ARCHIVOS ❍\n│→ ARCHIVOS RESIDUALES ELIMINADOS\n╰― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ― ⌫ ♻`))
}, 1000 * 60 * 10)

_quickTest().then(() => conn.logger.info(chalk.bold(`✦  H E C H O\n`.trim()))).catch(console.error)

async function isValidPhoneNumber(number) {
    try {
        number = number.replace(/\s+/g, '')
        if (number.startsWith('+521')) number = number.replace('+521', '+52');
        else if (number.startsWith('+52') && number[4] === '1') number = number.replace('+52 1', '+52');
        const parsedNumber = phoneUtil.parseAndKeepRawInput(number)
        return phoneUtil.isValidNumber(parsedNumber)
    } catch (error) {
        return false
    }
}
