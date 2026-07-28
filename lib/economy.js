import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

const dbDir = path.join(process.cwd(), 'src', 'database')
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

const db = new Database(path.join(dbDir, 'economy.sqlite'))
db.pragma('journal_mode = WAL')
db.pragma('busy_timeout = 5000')

db.exec(`
CREATE TABLE IF NOT EXISTS economy_users (
  jid TEXT PRIMARY KEY,
  wallet INTEGER NOT NULL DEFAULT 0,
  bank INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS economy_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
`)

const upsertUserStmt = db.prepare(`
INSERT INTO economy_users (jid, wallet, bank, updated_at)
VALUES (@jid, @wallet, @bank, unixepoch())
ON CONFLICT(jid) DO UPDATE SET
  wallet = excluded.wallet,
  bank = excluded.bank,
  updated_at = excluded.updated_at
`)
const moneySupplyStmt = db.prepare('SELECT COALESCE(SUM(wallet + bank), 0) AS total FROM economy_users')
const userCountStmt = db.prepare('SELECT COUNT(*) AS total FROM economy_users')
const setStateStmt = db.prepare(`
INSERT INTO economy_state (key, value, updated_at)
VALUES (?, ?, unixepoch())
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
`)
const getStateStmt = db.prepare('SELECT value FROM economy_state WHERE key = ?')

const DEFAULT_STATE = Object.freeze({
  targetMoneyPerUser: 2500,
  minPriceMultiplier: 0.55,
  maxPriceMultiplier: 3,
  minSalaryMultiplier: 0.35,
  maxSalaryMultiplier: 2.25,
  smoothing: 0.35
})

let lastGlobalSync = 0
const GLOBAL_SYNC_INTERVAL_MS = 30_000

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const toSafeInteger = (value, fallback = 0) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.max(0, Math.floor(number))
}

export function getEconomyConfig() {
  const row = getStateStmt.get('config')
  if (!row) return { ...DEFAULT_STATE }
  try {
    return { ...DEFAULT_STATE, ...JSON.parse(row.value) }
  } catch {
    return { ...DEFAULT_STATE }
  }
}

export function setEconomyConfig(config = {}) {
  const next = { ...getEconomyConfig(), ...config }
  setStateStmt.run('config', JSON.stringify(next))
  return next
}

export function syncEconomyUser(jid, user = {}) {
  if (!jid) return
  upsertUserStmt.run({ jid, wallet: toSafeInteger(user.coin), bank: toSafeInteger(user.bank) })
}

export function syncEconomyFromGlobal(users = global.db?.data?.users || {}, { force = false } = {}) {
  const now = Date.now()
  if (!force && now - lastGlobalSync < GLOBAL_SYNC_INTERVAL_MS) return
  const entries = Object.entries(users || {})
  const transaction = db.transaction((rows) => {
    for (const [jid, user] of rows) syncEconomyUser(jid, user)
  })
  transaction(entries)
  lastGlobalSync = now
}

export function getMoneySupply({ refresh = true } = {}) {
  if (refresh) syncEconomyFromGlobal()
  return toSafeInteger(moneySupplyStmt.get()?.total)
}

export function getEconomySnapshot({ refresh = true } = {}) {
  if (refresh) syncEconomyFromGlobal()
  const config = getEconomyConfig()
  const totalMoney = getMoneySupply({ refresh: false })
  const userCount = Math.max(1, toSafeInteger(userCountStmt.get()?.total, 1))
  const targetSupply = Math.max(config.targetMoneyPerUser, config.targetMoneyPerUser * userCount)
  const pressure = totalMoney / targetSupply
  const smoothedPressure = 1 + ((pressure - 1) * config.smoothing)
  const priceMultiplier = clamp(smoothedPressure, config.minPriceMultiplier, config.maxPriceMultiplier)
  const salaryMultiplier = clamp(1 / smoothedPressure, config.minSalaryMultiplier, config.maxSalaryMultiplier)
  return { totalMoney, userCount, targetSupply, pressure, priceMultiplier, salaryMultiplier, config }
}

export function getDynamicPrice(basePrice, options = {}) {
  const snapshot = getEconomySnapshot(options)
  return Math.max(1, Math.round(toSafeInteger(basePrice, 1) * snapshot.priceMultiplier))
}

export function getDynamicSalary(baseSalary, options = {}) {
  const snapshot = getEconomySnapshot(options)
  return Math.max(1, Math.round(toSafeInteger(baseSalary, 1) * snapshot.salaryMultiplier))
}

export function applyEconomyUserBalance(jid, user = {}) {
  syncEconomyUser(jid, user)
  return getEconomySnapshot({ refresh: false })
}

export default {
  getEconomyConfig,
  setEconomyConfig,
  syncEconomyUser,
  syncEconomyFromGlobal,
  getMoneySupply,
  getEconomySnapshot,
  getDynamicPrice,
  getDynamicSalary,
  applyEconomyUserBalance
}
