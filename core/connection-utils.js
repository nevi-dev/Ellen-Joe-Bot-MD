import fs from 'fs'
import path from 'path'
import chalk from 'chalk'

const LEGACY_PATTERNS = [/^pre-key-/, /^sender-key-/, /^session-/, /^app-state-sync-/, /^creds\.json$/, /^baileys_store\.json$/]

export function coreLog(scope, message, level = 'info') {
  const colors = { info: chalk.cyanBright, ok: chalk.greenBright, warn: chalk.yellowBright, error: chalk.redBright }
  const color = colors[level] || colors.info
  console.log(color(`╭─ Ellen Core • ${scope}\n╰─ ${message}`))
}

export function purgeLegacyAuthFiles(sessionDir) {
  if (!fs.existsSync(sessionDir)) return 0
  let removed = 0
  for (const file of fs.readdirSync(sessionDir)) {
    if (!LEGACY_PATTERNS.some((pattern) => pattern.test(file))) continue
    try {
      fs.unlinkSync(path.join(sessionDir, file))
      removed++
    } catch (error) {
      coreLog('SQLite Auth', `No se pudo purgar ${file}: ${error.message}`, 'warn')
    }
  }
  return removed
}

export function schedulePacificMidnight(task) {
  const planNext = () => {
    const now = new Date()
    const pacific = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(now)
    const values = Object.fromEntries(pacific.map((p) => [p.type, Number(p.value)]))
    const elapsed = ((values.hour * 60 + values.minute) * 60 + values.second) * 1000
    const delay = (24 * 60 * 60 * 1000) - elapsed
    setTimeout(async () => { await task(); planNext() }, delay || 24 * 60 * 60 * 1000).unref()
  }
  planNext()
}
