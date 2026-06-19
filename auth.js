import Database from 'better-sqlite3';
import { initAuthCreds, BufferJSON, proto } from '@whiskeysockets/baileys';
import path from 'path';
import fs from 'fs';

const LEGACY_FILE_PREFIXES = [
  'pre-key-',
  'sender-key-',
  'session-',
  'app-state-sync-',
];

const LEGACY_FILE_NAMES = new Set(['creds.json', 'baileys_store.json']);
const DEFAULT_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function isLegacyAuthFile(file) {
  return LEGACY_FILE_NAMES.has(file) || LEGACY_FILE_PREFIXES.some((prefix) => file.startsWith(prefix));
}

export function purgeLegacyFiles(dir) {
  if (!fs.existsSync(dir)) return;

  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (isLegacyAuthFile(file)) {
        fs.unlinkSync(path.join(dir, file));
      }
    }
  } catch (error) {
    console.warn(`[sqlite-auth] No se pudieron purgar archivos legacy en ${dir}:`, error?.message || error);
  }
}

function isPrunableKey(id) {
  return id.startsWith('sender-key-') || id.startsWith('pre-key-');
}

export function useSQLiteAuthState(sessionDir, options = {}) {
  const dbName = options.dbName || 'auth.db';
  const cleanOldFiles = options.cleanOldFiles !== false;
  const cleanupIntervalMs = options.cleanupIntervalMs ?? DEFAULT_CLEANUP_INTERVAL_MS;
  const retentionMs = options.retentionMs ?? DEFAULT_RETENTION_MS;
  const enableAutoCleanup = options.enableAutoCleanup !== false;

  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  if (cleanOldFiles) {
    purgeLegacyFiles(sessionDir);
  }

  const authDb = new Database(path.join(sessionDir, dbName));
  authDb.pragma('journal_mode = WAL');
  authDb.pragma('busy_timeout = 5000');
  authDb.exec(`
    CREATE TABLE IF NOT EXISTS auth (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
    CREATE INDEX IF NOT EXISTS idx_auth_updated_at ON auth(updated_at);
  `);

  const columns = authDb.prepare('PRAGMA table_info(auth)').all().map((column) => column.name);
  if (!columns.includes('updated_at')) {
    authDb.exec("ALTER TABLE auth ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0");
    authDb.prepare('UPDATE auth SET updated_at = ? WHERE updated_at = 0').run(Date.now());
  }

  const readStmt = authDb.prepare('SELECT data FROM auth WHERE id = ?');
  const writeStmt = authDb.prepare('INSERT OR REPLACE INTO auth (id, data, updated_at) VALUES (?, ?, ?)');
  const removeStmt = authDb.prepare('DELETE FROM auth WHERE id = ?');
  const pruneStmt = authDb.prepare(`
    DELETE FROM auth
    WHERE updated_at < ?
      AND (id LIKE 'sender-key-%' OR id LIKE 'pre-key-%')
  `);

  const readData = (id) => {
    const row = readStmt.get(id);
    return row ? JSON.parse(row.data, BufferJSON.reviver) : null;
  };

  const writeData = (data, id) => {
    writeStmt.run(id, JSON.stringify(data, BufferJSON.replacer), Date.now());
  };

  const removeData = (id) => removeStmt.run(id);

  const cleanupObsoleteData = () => {
    const cutoff = Date.now() - retentionMs;
    const result = pruneStmt.run(cutoff);
    authDb.pragma('wal_checkpoint(PASSIVE)');
    return result.changes;
  };

  let cleanupTimer;
  if (enableAutoCleanup && cleanupIntervalMs > 0) {
    cleanupTimer = setInterval(() => {
      try {
        const deleted = cleanupObsoleteData();
        if (deleted > 0) console.info(`[sqlite-auth] Limpieza interna: ${deleted} claves obsoletas eliminadas en ${sessionDir}`);
      } catch (error) {
        console.warn('[sqlite-auth] Error en limpieza interna:', error?.message || error);
      }
    }, cleanupIntervalMs);
    cleanupTimer.unref?.();
  }

  let creds = readData('creds') || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          ids.forEach((id) => {
            let value = readData(`${type}-${id}`);
            if (type === 'app-state-sync-key' && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value);
            }
            data[id] = value;
          });
          return data;
        },
        set: async (data) => {
          const writeMany = authDb.transaction((payload) => {
            for (const cat in payload) {
              for (const id in payload[cat]) {
                const val = payload[cat][id];
                const key = `${cat}-${id}`;
                if (val) writeData(val, key);
                else removeData(key);
              }
            }
          });
          writeMany(data);
        },
      },
    },
    saveCreds: () => writeData(creds, 'creds'),
    clearDb: () => authDb.prepare('DELETE FROM auth').run(),
    cleanupObsoleteData,
    purgeLegacyFiles: () => purgeLegacyFiles(sessionDir),
    closeDb: () => {
      if (cleanupTimer) clearInterval(cleanupTimer);
      authDb.close();
    },
    isPrunableKey,
  };
}
