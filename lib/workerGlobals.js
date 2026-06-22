import { createRequire } from 'module'
import { fileURLToPath, pathToFileURL } from 'url'
import path from 'path'
import { platform } from 'process'
const blockedGlobals = new Set(['global', 'globalThis', 'process', 'Buffer', 'console', 'performance', 'crypto', 'navigator', 'fetch', 'WebAssembly', 'conn', 'conns', 'db', 'DATABASE', 'plugins', 'reload', 'reloadHandler', 'midnightHotReload'])
export function createWorkerGlobalSnapshot(source = globalThis) {
const snapshot = {}
for (const key of Object.getOwnPropertyNames(source)) {
if (blockedGlobals.has(key)) continue
try {
const value = source[key]
if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'undefined') continue
snapshot[key] = structuredClone(value)
} catch {}
}
try {
if (source.db?.data) snapshot.db = { data: structuredClone(source.db.data) }
} catch {}
return snapshot
}
export function hydrateWorkerGlobals(snapshot = {}) {
for (const [key, value] of Object.entries(snapshot || {})) globalThis[key] = value
if (snapshot?.db) globalThis.DATABASE = globalThis.db
globalThis.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
return rmPrefix ? /file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL : pathToFileURL(pathURL).toString()
}
globalThis.__dirname = function dirname(pathURL) {
return path.dirname(globalThis.__filename(pathURL, true))
}
globalThis.__require = function require(dir = import.meta.url) {
return createRequire(dir)
}
globalThis.API = (name, route = '/', query = {}, apikeyqueryname) => (name in globalThis.APIs ? globalThis.APIs[name] : name) + route + (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({ ...query, ...(apikeyqueryname ? { [apikeyqueryname]: globalThis.APIKeys[name in globalThis.APIs ? globalThis.APIs[name] : name] } : {}) })) : '')
}
