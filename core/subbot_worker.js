import { parentPort, workerData } from 'worker_threads';
import pino from 'pino';
import { DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import NodeCache from 'node-cache';
import { makeWASocket } from '../lib/simple.js';
import { useSQLiteAuthState } from './auth.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'silent' });
const messageRetryCounterCache = new NodeCache({ stdTTL: 300, checkperiod: 60, useClones: false });
const processedMessages = new NodeCache({ stdTTL: 600, checkperiod: 120, useClones: false });

const queue = [];
let processing = false;
let shuttingDown = false;
let sock;
let auth;
let pairingMode = Boolean(workerData.pairingMode);

const post = (payload) => parentPort?.postMessage({ userId: workerData.userId, timestamp: Date.now(), ...payload });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function enqueueMessage(message) {
  const maxSize = workerData.queueMaxSize || 1_000;
  if (queue.length >= maxSize) {
    post({ type: 'queue.full', droppedMessageId: message?.key?.id });
    return;
  }
  queue.push(message);
  void drainQueue();
}

async function withTimeout(task, timeoutMs, label) {
  let timer;
  try {
    return await Promise.race([
      task(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} excedió ${timeoutMs}ms`)), timeoutMs);
        timer.unref?.();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function drainQueue() {
  if (processing || shuttingDown) return;
  processing = true;

  while (queue.length > 0 && !shuttingDown) {
    const message = queue.shift();
    const messageId = message?.key?.id;

    try {
      if (messageId && processedMessages.has(messageId)) continue;
      if (messageId) processedMessages.set(messageId, true);

      await withTimeout(
        () => handleIncomingMessage(message),
        workerData.messageTimeoutMs || 45_000,
        `Comando ${messageId || 'sin-id'}`,
      );
    } catch (error) {
      post({ type: 'message.error', messageId, error: error?.message || String(error) });
    } finally {
      await sleep(0);
    }
  }

  processing = false;
}

async function handleIncomingMessage(message) {
  const remoteJid = message?.key?.remoteJid;
  const text = message?.message?.conversation
    || message?.message?.extendedTextMessage?.text
    || message?.message?.imageMessage?.caption
    || message?.message?.videoMessage?.caption
    || '';

  if (!text || !/^[#/!.]/.test(text)) return;

  const [command, ...args] = text.trim().slice(1).split(/\s+/);
  post({ type: 'command.received', command, remoteJid });

  if (command === 'ping') {
    await sock.sendMessage(remoteJid, { text: `pong ${args.join(' ')}`.trim() });
  }
}

function cleanupRuntimeCaches() {
  messageRetryCounterCache.flushAll();
  processedMessages.flushAll();
  if (global.gc) global.gc();
  post({ type: 'memory.cleanup', rss: process.memoryUsage().rss, queueSize: queue.length });
}

async function start() {
  auth = useSQLiteAuthState(workerData.sessionDir, workerData.authOptions || {});
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    logger,
    printQRInTerminal: false,
    browser: [`Ellen-Joe Sub Bot ${workerData.userId}`, 'Chrome', '1.0.0'],
    auth: {
      creds: auth.state.creds,
      keys: makeCacheableSignalKeyStore(auth.state.keys, pino({ level: 'fatal' })),
    },
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    msgRetryCounterCache: messageRetryCounterCache,
    version,
  });

  sock.ev.on('creds.update', auth.saveCreds);
  sock.ev.on('messages.upsert', ({ messages = [], type }) => {
    if (type !== 'notify') return;
    for (const message of messages) enqueueMessage(message);
  });

  sock.ev.on('connection.update', async (update) => {
    const code = update.lastDisconnect?.error?.output?.statusCode;
    post({ type: 'connection.update', connection: update.connection, qr: update.qr, code });

    if (update.qr) {
      post({ type: 'qr', qr: update.qr });
      if (pairingMode && !sock.authState.creds.registered) {
        try {
          const code = await sock.requestPairingCode(String(workerData.userId).replace(/\D/g, ''));
          post({ type: 'pairing.code', code: code?.match(/.{1,4}/g)?.join('-') || code });
        } catch (error) {
          post({ type: 'pairing.error', error: error?.message || String(error) });
        }
      }
    }
    if (update.connection === 'close') {
      post({ type: 'disconnect', code });
      if (code !== DisconnectReason.loggedOut && !shuttingDown) {
        await sleep(3_000);
        await start();
      }
    }
  });

  setInterval(cleanupRuntimeCaches, 30 * 60 * 1000).unref?.();
  post({ type: 'worker.ready', sessionDir: workerData.sessionDir });
}

parentPort?.on('message', async (message) => {
  if (message?.type === 'mode') {
    pairingMode = Boolean(message.mcode);
  }
  if (message?.type === 'shutdown') {
    shuttingDown = true;
    try { await sock?.end?.(); } catch {}
    auth?.closeDb?.();
    process.exit(0);
  }
});

process.on('uncaughtException', (error) => post({ type: 'worker.uncaughtException', error: error?.message || String(error) }));
process.on('unhandledRejection', (error) => post({ type: 'worker.unhandledRejection', error: error?.message || String(error) }));

start().catch((error) => {
  post({ type: 'worker.start.error', error: error?.message || String(error) });
  process.exit(1);
});
