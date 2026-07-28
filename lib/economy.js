import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const dbDir = path.join(process.cwd(), 'src', 'database')
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

const db = new Database(path.join(dbDir, 'economy.sqlite'))
db.pragma('journal_mode = WAL')
db.pragma('busy_timeout = 5000')
db.pragma('foreign_keys = ON')

export const BOT_CURRENCY = 'DENIQUE'
export const FOREIGN_CURRENCY = 'DENIQUE PREMIUN'
const cron = (await import('node-cron').catch(() => ({ default: { schedule: (expression, task) => { const timer = setInterval(task, 60 * 60 * 1000); return { stop: () => clearInterval(timer), expression, fallback: true } } } }))).default
const PAYROLL_TZ = 'America/Santo_Domingo'
const DAY_MS = 86_400_000

const BANKS = Object.freeze([
  { code: 'VHB', name: 'Victoria Housekeeping Bank', interestRate: 0.012, maintenanceFee: 25, interbankTaxRate: 0.015, overdraftRate: 0.08 },
  { code: 'NCU', name: 'Nekomata Credit Union', interestRate: 0.008, maintenanceFee: 10, interbankTaxRate: 0.025, overdraftRate: 0.06 },
  { code: 'HZT', name: 'Hollow Zero Trust', interestRate: 0.018, maintenanceFee: 50, interbankTaxRate: 0.01, overdraftRate: 0.1 }
])

const JOBS = Object.freeze([
  { code: 'maid', title: 'Asistente de Victoria Housekeeping', salary: 2600, currency: BOT_CURRENCY, risk: 1 },
  { code: 'proxy', title: 'Proxy de Hollow Zero', salary: 42, currency: FOREIGN_CURRENCY, risk: 3 },
  { code: 'barista', title: 'Barista de Random Play', salary: 1800, currency: BOT_CURRENCY, risk: 1 },
  { code: 'investigator', title: 'Investigador de New Eridu', salary: 3600, currency: BOT_CURRENCY, risk: 2 }
])

db.exec(`
CREATE TABLE IF NOT EXISTS economy_users (
  jid TEXT PRIMARY KEY,
  wallet INTEGER NOT NULL DEFAULT 0,
  bank INTEGER NOT NULL DEFAULT 0,
  foreign_wallet INTEGER NOT NULL DEFAULT 0,
  foreign_bank INTEGER NOT NULL DEFAULT 0,
  credit_score INTEGER NOT NULL DEFAULT 600,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS economy_state (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS banks (code TEXT PRIMARY KEY, name TEXT NOT NULL, interest_rate REAL NOT NULL, maintenance_fee INTEGER NOT NULL, interbank_tax_rate REAL NOT NULL, overdraft_rate REAL NOT NULL);
CREATE TABLE IF NOT EXISTS bank_accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL UNIQUE, bank_code TEXT NOT NULL, account_number TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'active', opened_at INTEGER NOT NULL DEFAULT (unixepoch()), FOREIGN KEY(bank_code) REFERENCES banks(code));
CREATE TABLE IF NOT EXISTS cards (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, bank_code TEXT NOT NULL, card_number TEXT NOT NULL UNIQUE, card_type TEXT NOT NULL DEFAULT 'debit', expiry_month INTEGER NOT NULL, expiry_year INTEGER NOT NULL, cvv TEXT NOT NULL, balance INTEGER NOT NULL DEFAULT 0, foreign_balance INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active', issued_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS jobs (code TEXT PRIMARY KEY, title TEXT NOT NULL, salary INTEGER NOT NULL, currency TEXT NOT NULL, risk INTEGER NOT NULL DEFAULT 1, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS contracts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL UNIQUE, job_code TEXT NOT NULL, hired_at INTEGER NOT NULL, last_paid_until INTEGER, status TEXT NOT NULL DEFAULT 'active', FOREIGN KEY(job_code) REFERENCES jobs(code));
CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, type TEXT NOT NULL, concept TEXT NOT NULL, amount INTEGER NOT NULL, currency TEXT NOT NULL, source TEXT, destination TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS loans (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, principal INTEGER NOT NULL, outstanding INTEGER NOT NULL, weekly_payment INTEGER NOT NULL, interest_rate REAL NOT NULL, late_interest_rate REAL NOT NULL, next_due_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at INTEGER NOT NULL DEFAULT (unixepoch()));
`)

for (const column of ['foreign_wallet INTEGER NOT NULL DEFAULT 0', 'foreign_bank INTEGER NOT NULL DEFAULT 0', 'credit_score INTEGER NOT NULL DEFAULT 600']) {
  try { db.exec(`ALTER TABLE economy_users ADD COLUMN ${column}`) } catch {}
}
const seedBanks = db.prepare('INSERT OR REPLACE INTO banks VALUES (@code,@name,@interestRate,@maintenanceFee,@interbankTaxRate,@overdraftRate)')
const seedJobs = db.prepare('INSERT OR REPLACE INTO jobs VALUES (@code,@title,@salary,@currency,@risk,1)')
for (const bank of BANKS) seedBanks.run(bank)
for (const job of JOBS) seedJobs.run(job)

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const toSafeInteger = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : fallback
const nowSec = () => Math.floor(Date.now() / 1000)
const getStateStmt = db.prepare('SELECT value FROM economy_state WHERE key = ?')
const setStateStmt = db.prepare('INSERT INTO economy_state (key,value,updated_at) VALUES (?,?,unixepoch()) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at')

const DEFAULT_STATE = Object.freeze({ targetMoneyPerUser: 2500, minPriceMultiplier: 0.55, maxPriceMultiplier: 3, minSalaryMultiplier: 0.35, maxSalaryMultiplier: 2.25, smoothing: 0.35, redenominationThreshold: 1_000_000_000_000 })
let lastGlobalSync = 0
const GLOBAL_SYNC_INTERVAL_MS = 30_000

export function getEconomyConfig() { try { return { ...DEFAULT_STATE, ...JSON.parse(getStateStmt.get('config')?.value || '{}') } } catch { return { ...DEFAULT_STATE } } }
export function setEconomyConfig(config = {}) { const next = { ...getEconomyConfig(), ...config }; setStateStmt.run('config', JSON.stringify(next)); return next }



export function recordWalletIncome(userId, user, amount, concept, source = 'command') { amount = toSafeInteger(amount); if (!amount) { syncEconomyUser(userId, user); return 0 } user.coin = toSafeInteger(user.coin) + amount; syncEconomyUser(userId, user); ledger({ userId, type: 'ingreso', concept, amount, source, destination: 'wallet' }); return amount }
export function recordWalletExpense(userId, user, amount, concept, destination = 'command') { amount = toSafeInteger(amount); if (!amount) { syncEconomyUser(userId, user); return 0 } if (toSafeInteger(user.coin) < amount) throw new Error('Fondos insuficientes'); user.coin = toSafeInteger(user.coin) - amount; syncEconomyUser(userId, user); ledger({ userId, type: 'egreso', concept, amount, source: 'wallet', destination }); return amount }
export function recordBankTransfer(fromUserId, toUserId, amount, concept = 'Transferencia bancaria') { return db.transaction(() => { amount = toSafeInteger(amount); const sender = global.db.data.users[fromUserId]; const receiver = global.db.data.users[toUserId]; if (!sender || !receiver) throw new Error('Usuario no encontrado'); if (toSafeInteger(sender.bank) < amount) throw new Error('Fondos insuficientes'); sender.bank -= amount; receiver.bank = toSafeInteger(receiver.bank) + amount; syncEconomyUser(fromUserId, sender); syncEconomyUser(toUserId, receiver); ledger({ userId: fromUserId, type: 'egreso', concept, amount, source: 'bank', destination: toUserId }); ledger({ userId: toUserId, type: 'ingreso', concept, amount, source: fromUserId, destination: 'bank' }); return amount })() }
export function moveWalletToBank(userId, user, amount) { amount = toSafeInteger(amount); if (toSafeInteger(user.coin) < amount) throw new Error('Fondos insuficientes'); user.coin -= amount; user.bank = toSafeInteger(user.bank) + amount; syncEconomyUser(userId, user); ledger({ userId, type: 'egreso', concept: 'Depósito a banco', amount, source: 'wallet', destination: 'bank' }); return amount }
export function moveBankToWallet(userId, user, amount) { amount = toSafeInteger(amount); if (toSafeInteger(user.bank) < amount) throw new Error('Fondos insuficientes'); user.bank -= amount; user.coin = toSafeInteger(user.coin) + amount; syncEconomyUser(userId, user); ledger({ userId, type: 'ingreso', concept: 'Retiro de banco', amount, source: 'bank', destination: 'wallet' }); return amount }

export function syncEconomyUser(jid, user = {}) {
  if (!jid) return
  db.prepare(`INSERT INTO economy_users (jid,wallet,bank,foreign_wallet,foreign_bank,credit_score,updated_at) VALUES (?,?,?,?,?,?,unixepoch())
    ON CONFLICT(jid) DO UPDATE SET wallet=excluded.wallet, bank=excluded.bank, foreign_wallet=excluded.foreign_wallet, foreign_bank=excluded.foreign_bank, updated_at=excluded.updated_at`).run(jid, toSafeInteger(user.coin), toSafeInteger(user.bank), toSafeInteger(user.dennyPremium), toSafeInteger(user.foreignBank), toSafeInteger(user.creditScore, 600))
}
export function syncEconomyFromGlobal(users = global.db?.data?.users || {}, { force = false } = {}) { const now = Date.now(); if (!force && now - lastGlobalSync < GLOBAL_SYNC_INTERVAL_MS) return; db.transaction((rows) => rows.forEach(([jid, user]) => syncEconomyUser(jid, user)))(Object.entries(users || {})); lastGlobalSync = now }
export const ledger = (tx) => db.prepare('INSERT INTO transactions (user_id,type,concept,amount,currency,source,destination,created_at) VALUES (?,?,?,?,?,?,?,?)').run(tx.userId, tx.type, tx.concept, toSafeInteger(tx.amount), tx.currency || BOT_CURRENCY, tx.source || null, tx.destination || null, tx.createdAt || nowSec())

export function getMoneySupply({ refresh = true } = {}) { if (refresh) syncEconomyFromGlobal(); return toSafeInteger(db.prepare('SELECT COALESCE(SUM(wallet+bank),0) total FROM economy_users').get()?.total) }
export function getExchangeRate() { const users = Math.max(1, toSafeInteger(db.prepare('SELECT COUNT(*) total FROM economy_users').get()?.total, 1)); const pressure = getMoneySupply() / Math.max(1, getEconomyConfig().targetMoneyPerUser * users); return Number(clamp(1 + pressure * 0.22, 1, 250000).toFixed(4)) }
export function getEconomySnapshot({ refresh = true } = {}) { if (refresh) syncEconomyFromGlobal(); const config = getEconomyConfig(); const totalMoney = getMoneySupply({ refresh: false }); const userCount = Math.max(1, toSafeInteger(db.prepare('SELECT COUNT(*) total FROM economy_users').get()?.total, 1)); const targetSupply = Math.max(config.targetMoneyPerUser, config.targetMoneyPerUser * userCount); const pressure = totalMoney / targetSupply; const smoothedPressure = 1 + ((pressure - 1) * config.smoothing); return { totalMoney, userCount, targetSupply, pressure, exchangeRate: getExchangeRate(), priceMultiplier: clamp(smoothedPressure, config.minPriceMultiplier, config.maxPriceMultiplier), salaryMultiplier: clamp(1 / smoothedPressure, config.minSalaryMultiplier, config.maxSalaryMultiplier), config } }
export const getDynamicPrice = (basePrice, options = {}) => Math.max(1, Math.round(toSafeInteger(basePrice, 1) * getEconomySnapshot(options).priceMultiplier))
export const getDynamicSalary = (baseSalary, options = {}) => Math.max(1, Math.round(toSafeInteger(baseSalary, 1) * getEconomySnapshot(options).salaryMultiplier))
export function applyEconomyUserBalance(jid, user = {}) { syncEconomyUser(jid, user); return getEconomySnapshot({ refresh: false }) }

function uniqueNumber(table, column, length) { const stmt = db.prepare(`SELECT 1 FROM ${table} WHERE ${column}=?`); let value; do { value = Array.from({ length }, () => crypto.randomInt(0, 10)).join('').replace(/^0/, String(crypto.randomInt(1, 10))) } while (stmt.get(value)); return value }
export const listBanks = () => db.prepare('SELECT * FROM banks ORDER BY name').all()
export const listJobs = () => db.prepare('SELECT * FROM jobs WHERE active=1 ORDER BY salary').all()
export const getAccountByUser = (jid) => db.prepare('SELECT a.*, b.name bank_name, b.interbank_tax_rate FROM bank_accounts a JOIN banks b ON b.code=a.bank_code WHERE user_id=?').get(jid)
export const getAccountByNumber = (n) => db.prepare('SELECT a.*, b.name bank_name, b.interbank_tax_rate FROM bank_accounts a JOIN banks b ON b.code=a.bank_code WHERE account_number=?').get(String(n))
export function openBankAccount(userId, bankCode) { return db.transaction(() => { syncEconomyUser(userId, global.db?.data?.users?.[userId] || {}); const bank = db.prepare('SELECT * FROM banks WHERE code=?').get(bankCode); if (!bank) throw new Error('Banco inválido'); const existing = getAccountByUser(userId); if (existing) return existing; const accountNumber = uniqueNumber('bank_accounts', 'account_number', crypto.randomInt(10, 13)); db.prepare('INSERT INTO bank_accounts (user_id,bank_code,account_number) VALUES (?,?,?)').run(userId, bankCode, accountNumber); ledger({ userId, type: 'ingreso', concept: `Apertura ${bank.name}`, amount: 0, source: 'system', destination: accountNumber }); return getAccountByUser(userId) })() }
export function transferByAccount(fromUserId, toAccountNumber, amount) { return db.transaction(() => { const from = getAccountByUser(fromUserId); const to = getAccountByNumber(toAccountNumber); amount = toSafeInteger(amount); if (!from || !to) throw new Error('Cuenta no encontrada'); if (from.user_id === to.user_id) throw new Error('No puedes transferirte a ti mismo'); const tax = from.bank_code === to.bank_code ? 0 : Math.ceil(amount * from.interbank_tax_rate); const sender = global.db.data.users[fromUserId]; const receiver = global.db.data.users[to.user_id] || (global.db.data.users[to.user_id] = {}); if (toSafeInteger(sender.bank) < amount + tax) throw new Error('Fondos insuficientes'); sender.bank -= amount + tax; receiver.bank = toSafeInteger(receiver.bank) + amount; syncEconomyUser(fromUserId, sender); syncEconomyUser(to.user_id, receiver); ledger({ userId: fromUserId, type: 'egreso', concept: `Transferencia a ${to.account_number}`, amount: amount + tax, source: from.account_number, destination: to.account_number }); ledger({ userId: to.user_id, type: 'ingreso', concept: `Transferencia de ${from.account_number}`, amount, source: from.account_number, destination: to.account_number }); return { amount, tax, to } })() }
export function issueCard(userId, type = 'debit') { return db.transaction(() => { const account = getAccountByUser(userId); if (!account) throw new Error('Primero abre una cuenta bancaria'); const date = new Date(); const card = { cardNumber: uniqueNumber('cards', 'card_number', 16), month: date.getUTCMonth() + 1, year: date.getUTCFullYear() + 4, cvv: String(crypto.randomInt(0, 1000)).padStart(3, '0') }; db.prepare('INSERT INTO cards (user_id,bank_code,card_number,card_type,expiry_month,expiry_year,cvv) VALUES (?,?,?,?,?,?,?)').run(userId, account.bank_code, card.cardNumber, type, card.month, card.year, card.cvv); ledger({ userId, type: 'ingreso', concept: `Emisión tarjeta ${type}`, amount: 0, source: account.bank_code, destination: card.cardNumber }); return card })() }
export function stealCard(thiefId, cardNumber) { return db.transaction(() => { const card = db.prepare("SELECT * FROM cards WHERE card_number=? AND status='active'").get(String(cardNumber)); if (!card || card.user_id === thiefId) throw new Error('Tarjeta inválida'); const total = toSafeInteger(card.balance); if (total <= 0) throw new Error('La tarjeta no tiene fondos'); const thief = global.db.data.users[thiefId] || (global.db.data.users[thiefId] = {}); thief.coin = toSafeInteger(thief.coin) + total; db.prepare('UPDATE cards SET balance=0 WHERE id=?').run(card.id); syncEconomyUser(thiefId, thief); ledger({ userId: card.user_id, type: 'egreso', concept: 'Robo por exposición de tarjeta', amount: total, source: card.card_number, destination: thiefId }); ledger({ userId: thiefId, type: 'ingreso', concept: 'Robo de tarjeta', amount: total, source: card.card_number, destination: 'wallet' }); return total })() }
export function applyJob(userId, jobCode) { return db.transaction(() => { const job = db.prepare('SELECT * FROM jobs WHERE code=? AND active=1').get(jobCode); if (!job) throw new Error('Empleo inválido'); db.prepare("INSERT INTO contracts (user_id,job_code,hired_at,last_paid_until,status) VALUES (?,?,?,NULL,'active') ON CONFLICT(user_id) DO UPDATE SET job_code=excluded.job_code,hired_at=excluded.hired_at,last_paid_until=NULL,status='active'").run(userId, jobCode, nowSec()); ledger({ userId, type: 'ingreso', concept: `Contratación: ${job.title}`, amount: 0, currency: job.currency, source: 'payroll', destination: userId }); return job })() }
function payrollDate(d = new Date()) { const y = d.getFullYear(), m = d.getMonth(); const last = new Date(y, m + 1, 0).getDate(); let pay = d.getDate() <= 15 ? new Date(y, m, 15) : new Date(y, m, last); while ([0, 6].includes(pay.getDay())) pay.setDate(pay.getDate() - 1); return pay }
export function runPayroll(referenceDate = new Date()) { return db.transaction(() => { const pay = payrollDate(referenceDate); const payEnd = Math.floor(pay.getTime() / 1000); let count = 0; for (const c of db.prepare("SELECT c.*, j.title,j.salary,j.currency FROM contracts c JOIN jobs j ON j.code=c.job_code WHERE c.status='active'").all()) { const start = Math.max(c.last_paid_until || c.hired_at, c.hired_at); const days = Math.max(0, Math.ceil((payEnd - start) / DAY_MS)); if (!days) continue; const amount = Math.round((c.salary / 15) * Math.min(days, 15)); const user = global.db?.data?.users?.[c.user_id] || {}; if (c.currency === FOREIGN_CURRENCY) user.dennyPremium = toSafeInteger(user.dennyPremium) + amount; else user.bank = toSafeInteger(user.bank) + amount; syncEconomyUser(c.user_id, user); db.prepare('UPDATE contracts SET last_paid_until=? WHERE id=?').run(payEnd, c.id); ledger({ userId: c.user_id, type: 'ingreso', concept: `Nómina ${c.title} (${days} días)`, amount, currency: c.currency, source: 'payroll', destination: c.user_id, createdAt: payEnd }); count++ } return count })() }
export function requestLoan(userId, amount) { return db.transaction(() => { syncEconomyUser(userId, global.db?.data?.users?.[userId] || {}); const u = db.prepare('SELECT * FROM economy_users WHERE jid=?').get(userId); if (db.prepare("SELECT 1 FROM loans WHERE user_id=? AND status='active'").get(userId)) throw new Error('Ya tienes un préstamo activo'); if (u.credit_score < 520) throw new Error('Credit Score insuficiente'); const max = Math.max(500, (u.credit_score - 450) * 20); amount = Math.min(toSafeInteger(amount), max); const weekly = Math.ceil(amount / 6 * 1.08); const due = nowSec() + 7 * 86400; const user = global.db.data.users[userId]; user.bank = toSafeInteger(user.bank) + amount; syncEconomyUser(userId, user); db.prepare('INSERT INTO loans (user_id,principal,outstanding,weekly_payment,interest_rate,late_interest_rate,next_due_at) VALUES (?,?,?,?,0.08,0.04,?)').run(userId, amount, amount, weekly, due); ledger({ userId, type: 'ingreso', concept: 'Desembolso de préstamo', amount, source: 'Hollow Zero Trust', destination: 'bank' }); return { amount, weekly, due } })() }

export function cashOutCard(userId, cardNumber) { return db.transaction(() => { const card = db.prepare("SELECT * FROM cards WHERE card_number=? AND user_id=? AND status='active'").get(String(cardNumber), userId); if (!card) throw new Error('Tarjeta inválida'); const amount = toSafeInteger(card.balance); if (!amount) throw new Error('La tarjeta no tiene fondos'); const user = global.db.data.users[userId] || (global.db.data.users[userId] = {}); user.coin = toSafeInteger(user.coin) + amount; db.prepare('UPDATE cards SET balance=0 WHERE id=?').run(card.id); syncEconomyUser(userId, user); ledger({ userId, type: 'ingreso', concept: 'Retiro de tarjeta a efectivo', amount, source: card.card_number, destination: 'wallet' }); return amount })() }
export function loadCard(userId, cardNumber, amount) { return db.transaction(() => { amount = toSafeInteger(amount); const card = db.prepare("SELECT * FROM cards WHERE card_number=? AND user_id=? AND status='active'").get(String(cardNumber), userId); if (!card) throw new Error('Tarjeta inválida'); const user = global.db.data.users[userId]; if (toSafeInteger(user.bank) < amount) throw new Error('Fondos insuficientes'); user.bank -= amount; db.prepare('UPDATE cards SET balance=balance+? WHERE id=?').run(amount, card.id); syncEconomyUser(userId, user); ledger({ userId, type: 'egreso', concept: 'Recarga de tarjeta', amount, source: 'bank', destination: card.card_number }); return amount })() }
export function repayLoan(userId, amount) { return db.transaction(() => { amount = toSafeInteger(amount); const loan = db.prepare("SELECT * FROM loans WHERE user_id=? AND status='active' ORDER BY created_at LIMIT 1").get(userId); if (!loan) throw new Error('No tienes préstamo activo'); const user = global.db.data.users[userId]; const payment = Math.min(amount, loan.outstanding); if (toSafeInteger(user.bank) < payment) throw new Error('Fondos insuficientes'); user.bank -= payment; const outstanding = loan.outstanding - payment; db.prepare('UPDATE loans SET outstanding=?, status=?, next_due_at=? WHERE id=?').run(outstanding, outstanding <= 0 ? 'paid' : 'active', outstanding <= 0 ? loan.next_due_at : loan.next_due_at + 7 * 86400, loan.id); user.creditScore = toSafeInteger(user.creditScore, 600) + (outstanding <= 0 ? 25 : 5); syncEconomyUser(userId, user); ledger({ userId, type: 'egreso', concept: 'Pago de préstamo', amount: payment, source: 'bank', destination: 'loan' }); return { paid: payment, outstanding } })() }
export function processOverdueLoans(reference = nowSec()) { return db.transaction(() => { let count = 0; for (const loan of db.prepare("SELECT * FROM loans WHERE status='active' AND next_due_at < ?").all(reference)) { const penalty = Math.ceil(loan.outstanding * loan.late_interest_rate); db.prepare('UPDATE loans SET outstanding=outstanding+?, next_due_at=next_due_at+? WHERE id=?').run(penalty, 7 * 86400, loan.id); const user = global.db?.data?.users?.[loan.user_id] || {}; user.creditScore = Math.max(300, toSafeInteger(user.creditScore, 600) - 35); syncEconomyUser(loan.user_id, user); ledger({ userId: loan.user_id, type: 'egreso', concept: 'Interés moratorio de préstamo', amount: penalty, source: 'loan', destination: 'debt' }); count++ } return count })() }

export const getTransactions = (userId, page = 1, limit = 10) => db.prepare('SELECT * FROM transactions WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?').all(userId, limit, (Math.max(1, page) - 1) * limit)
export const formatMoney = (n, c = BOT_CURRENCY) => `${toSafeInteger(n).toLocaleString('es-DO')} ${c}`
export function maybeRedenominate() { const max = db.prepare('SELECT MAX(MAX(wallet,bank)) max FROM economy_users').get()?.max || 0; if (max < getEconomyConfig().redenominationThreshold) return null; const factor = max > 1_000_000_000_000_000 ? 1_000_000 : 1_000; db.transaction(() => { db.exec(`UPDATE economy_users SET wallet=wallet/${factor}, bank=bank/${factor}; UPDATE cards SET balance=balance/${factor}; UPDATE loans SET principal=principal/${factor}, outstanding=outstanding/${factor}, weekly_payment=weekly_payment/${factor}; UPDATE jobs SET salary=salary/${factor} WHERE currency='${BOT_CURRENCY}'`); setStateStmt.run('lastRedenomination', JSON.stringify({ factor, at: nowSec() })) })(); return factor }

let payrollStarted = false
export function startEconomyCron() { if (payrollStarted) return; payrollStarted = true; cron.schedule('0 0 * * *', () => { const today = new Date(); if (payrollDate(today).toDateString() === today.toDateString()) runPayroll(today); processOverdueLoans(); maybeRedenominate() }, { timezone: PAYROLL_TZ }) }
startEconomyCron()

export default { db, BOT_CURRENCY, FOREIGN_CURRENCY, PAYROLL_TZ, listBanks, listJobs, getEconomyConfig, setEconomyConfig, recordWalletIncome, recordWalletExpense, recordBankTransfer, moveWalletToBank, moveBankToWallet, syncEconomyUser, syncEconomyFromGlobal, getMoneySupply, getExchangeRate, getEconomySnapshot, getDynamicPrice, getDynamicSalary, applyEconomyUserBalance, openBankAccount, transferByAccount, issueCard, stealCard, applyJob, runPayroll, requestLoan, cashOutCard, loadCard, repayLoan, processOverdueLoans, getTransactions, formatMoney, maybeRedenominate, startEconomyCron }
