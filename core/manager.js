import path from 'path';
import { fileURLToPath } from 'url';
import { Worker } from 'worker_threads';
import pino from 'pino';
import { DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import { makeWASocket } from '../lib/simple.js';
import { useSQLiteAuthState } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export const SESSION_ROOT = path.resolve(repoRoot, globalThis.Ellensessions || 'EllenSessions');
export const MAIN_BOT_SESSION_DIR = SESSION_ROOT;
export const SUB_BOTS_SESSION_ROOT = path.resolve(repoRoot, globalThis.jadi || 'EllenJadiBots');

const workers = new Map();

export async function startMainBot(options = {}) {
  const { state, saveCreds } = useSQLiteAuthState(MAIN_BOT_SESSION_DIR, options.authOptions);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: options.printQRInTerminal ?? true,
    browser: options.browser || ['Ellen-Joe Main Bot', 'Chrome', '1.0.0'],
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
    },
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    version,
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (update) => {
    logger.info({ update }, '[main-bot] connection.update');
    if (update.connection === 'close') {
      const code = update.lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut && options.autoReconnect !== false) {
        startMainBot(options).catch((error) => logger.error({ error }, '[main-bot] reconnect failed'));
      }
    }
  });

  return sock;
}

export function startSubBot(userId, options = {}) {
  const normalizedUserId = String(userId).replace(/[^0-9A-Za-z_.-]/g, '_');
  const sessionDir = path.join(SUB_BOTS_SESSION_ROOT, normalizedUserId);

  if (workers.has(normalizedUserId)) {
    return workers.get(normalizedUserId);
  }

  const worker = new Worker(new URL('./subbot_worker.js', import.meta.url), {
    workerData: {
      userId: normalizedUserId,
      sessionDir,
      authOptions: options.authOptions || {},
      messageTimeoutMs: options.messageTimeoutMs || 45_000,
      queueMaxSize: options.queueMaxSize || 1_000,
      pairingMode: Boolean(options.pairingMode),
    },
  });

  worker.on('message', (message) => {
    logger.info({ subBot: normalizedUserId, message }, '[sub-bot] worker message');
    options.onMessage?.(message, worker);
  });

  worker.on('error', (error) => {
    logger.error({ subBot: normalizedUserId, error }, '[sub-bot] worker error');
    options.onError?.(error, worker);
  });

  worker.on('exit', (code) => {
    workers.delete(normalizedUserId);
    logger.warn({ subBot: normalizedUserId, code }, '[sub-bot] worker exited');
    options.onExit?.(code);
  });

  workers.set(normalizedUserId, worker);
  return worker;
}

export async function stopSubBot(userId) {
  const normalizedUserId = String(userId).replace(/[^0-9A-Za-z_.-]/g, '_');
  const worker = workers.get(normalizedUserId);
  if (!worker) return false;
  worker.postMessage({ type: 'shutdown' });
  await worker.terminate();
  workers.delete(normalizedUserId);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await startMainBot();
  const subBots = (process.env.SUB_BOTS || '').split(',').map((id) => id.trim()).filter(Boolean);
  subBots.forEach((id) => startSubBot(id));
}
