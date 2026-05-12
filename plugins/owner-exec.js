import syntaxerror from 'syntax-error'
import { format } from 'util'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { createRequire } from 'module'
import * as baileys from '@whiskeysockets/baileys' // Importamos todo Baileys

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(__dirname)

let handler = async (m, _2) => {
  let { conn, isOwner, usedPrefix, noPrefix, args, groupMetadata } = _2
  if (!isOwner) return
  
  let _return
  let _syntax = ''
  let _body = args.join(' ')
  
  // MEJORA 1: Detección inteligente de return. 
  // Si usas 'const', 'let', 'var' o 'if', NO añade 'return' al principio para no romper la sintaxis.
  let _text = (/^(const|let|var|if|for|while|try|await|import|return)\s/.test(_body) ? '' : 'return ') + _body

  let old = m.exp * 1
  try {
    let i = 15
    let f = { exports: {} }
    
    // MEJORA 2: Inyectamos todo Baileys y utilidades globales
    // Ahora 'generateWAMessageContent' y otros estarán disponibles directamente
    let exec = new (async () => { }).constructor(
      'print', 'm', 'handler', 'require', 'conn', 'Array', 'process', 'args', 
      'groupMetadata', 'module', 'exports', 'baileys', 'baileysFuncs', _text
    )

    _return = await exec.call(conn, 
      (...args) => {
        if (--i < 1) return
        console.log(...args)
        return conn.reply(m.chat, format(...args), m)
      }, 
      m, handler, require, conn, CustomArray, process, args, 
      groupMetadata, f, f.exports, 
      baileys, // Acceso a baileys.proto, etc.
      { ...baileys } // Acceso directo a funciones como generateWAMessageContent
    )
  } catch (e) {
    let err = syntaxerror(_text, 'Execution Function', {
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
      sourceType: 'module'
    })
    if (err) _syntax = '```' + err + '```\n\n'
    _return = e
  } finally {
    // MEJORA 3: Si el resultado es una promesa o un objeto de mensaje, 
    // podrías incluso hacer que lo envíe automáticamente, pero por ahora solo texto.
    conn.reply(m.chat, _syntax + format(_return), m)
    m.exp = old
  }
}

handler.help = ['eval']
handler.tags = ['owner']
handler.command = ['e']
handler.rowner = true

export default handler

class CustomArray extends Array {
  constructor(...args) {
    if (typeof args[0] == 'number') return super(Math.min(args[0], 10000))
    else return super(...args)
  }
}
