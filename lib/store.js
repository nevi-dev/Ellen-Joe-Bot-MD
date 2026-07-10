import { readFileSync, writeFileSync, existsSync } from "fs";
const { initAuthCreds, BufferJSON, proto } = (
  await import("@whiskeysockets/baileys")
).default;

const GROUP_METADATA_TTL = 12 * 60 * 60 * 1000;
const MIN_FETCH_JITTER = 750;
const MAX_FETCH_JITTER = 2500;
const smartFetchState = new WeakMap();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomJitter = () => MIN_FETCH_JITTER + Math.floor(Math.random() * (MAX_FETCH_JITTER - MIN_FETCH_JITTER + 1));
const cleanJid = (jid = "") => String(jid || "").split(":")[0];

const normalizeParticipant = (participant = {}) => {
  const jid = cleanJid(participant.jid || participant.id);
  if (!jid) return null;
  return {
    ...participant,
    id: jid,
    jid,
    lid: cleanJid(participant.lid) || undefined,
    admin: participant.admin || undefined,
    name: participant.name || participant.notify || undefined,
  };
};

const normalizeGroupMetadata = (metadata = {}) => {
  const jid = cleanJid(metadata.id || metadata.jid);
  if (!jid) return null;
  const participants = Array.isArray(metadata.participants)
    ? metadata.participants.map(normalizeParticipant).filter(Boolean)
    : [];
  return {
    id: jid,
    jid,
    subject: metadata.subject || metadata.name || "",
    owner: cleanJid(metadata.owner) || undefined,
    participants,
    participants_count: participants.length || metadata.participants_count || 0,
    updated_at: metadata.updated_at || Date.now(),
  };
};

function getSmartState(conn) {
  let state = smartFetchState.get(conn);
  if (!state) {
    state = { inFlight: new Map(), lastFetchAt: 0 };
    smartFetchState.set(conn, state);
  }
  return state;
}

function cacheGroupLocally(conn, metadata) {
  const normalized = normalizeGroupMetadata(metadata);
  if (!normalized) return null;
  conn.chats = conn.chats || {};
  const previous = conn.chats[normalized.jid] || { id: normalized.jid };
  conn.chats[normalized.jid] = {
    ...previous,
    id: normalized.jid,
    subject: normalized.subject || previous.subject || "",
    metadata: normalized,
    isChats: true,
    updated_at: Date.now(),
  };
  global.db?.adapter?.upsertGroup?.(normalized);
  return normalized;
}

function installSmartCache(conn) {
  if (conn.getSmartGroupMetadata) return;

  conn.getSmartGroupMetadata = async function getSmartGroupMetadata(jid, { maxAge = GROUP_METADATA_TTL, force = false } = {}) {
    const groupJid = cleanJid(jid);
    if (!groupJid) return null;

    const memoryMetadata = this.chats?.[groupJid]?.metadata;
    if (!force && memoryMetadata?.updated_at && Date.now() - Number(memoryMetadata.updated_at) <= maxAge) {
      return { ...memoryMetadata, fromCache: true };
    }

    if (!force) {
      const cached = global.db?.adapter?.getCachedGroupMetadata?.(groupJid, { maxAge });
      if (cached) {
        this.chats = this.chats || {};
        this.chats[groupJid] = {
          ...(this.chats[groupJid] || { id: groupJid }),
          id: groupJid,
          subject: cached.subject || this.chats[groupJid]?.subject || "",
          metadata: cached,
          isChats: true,
          updated_at: cached.updated_at || Date.now(),
        };
        return cached;
      }
    }

    const state = getSmartState(this);
    if (state.inFlight.has(groupJid)) return state.inFlight.get(groupJid);

    const fetchPromise = (async () => {
      const elapsed = Date.now() - state.lastFetchAt;
      const jitter = randomJitter();
      if (elapsed < jitter) await delay(jitter - elapsed);
      state.lastFetchAt = Date.now();
      const metadata = await this.groupMetadata(groupJid);
      return cacheGroupLocally(this, metadata);
    })().finally(() => state.inFlight.delete(groupJid));

    state.inFlight.set(groupJid, fetchPromise);
    return fetchPromise;
  };

  conn.cacheGroupMetadata = function cacheGroupMetadata(metadata) {
    return cacheGroupLocally(this, metadata);
  };
}

function bind(conn) {
  installSmartCache(conn);
  if (!conn.chats) conn.chats = {};

  function updateNameToDb(contacts) {
    if (!contacts) return;
    try {
      contacts = contacts.contacts || contacts;
      for (const contact of contacts) {
        const id = conn.decodeJid(contact.id);
        if (!id || id === "status@broadcast") continue;
        global.db?.adapter?.upsertContact?.({ ...contact, jid: id });
        let chats = conn.chats[id];
        if (!chats)
          chats = conn.chats[id] = {
            ...contact,
            id: id,
          };
        conn.chats[id] = {
          ...chats,
          ...({
            ...contact,
            id: id,
            ...(id.endsWith("@g.us")
              ? {
                  subject:
                    contact.subject || contact.name || chats.subject || "",
                }
              : {
                  name:
                    contact.notify ||
                    contact.name ||
                    chats.name ||
                    chats.notify ||
                    "",
                }),
          } || {}),
        };
      }
    } catch (e) {
      console.error(e);
    }
  }
  conn.ev.on("contacts.upsert", updateNameToDb);
  conn.ev.on("groups.update", (groups) => {
    updateNameToDb(groups);
    try {
      for (const update of groups || []) {
        const id = conn.decodeJid(update.id);
        if (!id || id === "status@broadcast" || !id.endsWith("@g.us")) continue;
        const previous = conn.chats[id]?.metadata || {};
        cacheGroupLocally(conn, { ...previous, ...update, id, jid: id, participants: previous.participants || [] });
      }
    } catch (e) {
      console.error(e);
    }
  });
  conn.ev.on("contacts.set", updateNameToDb);
  conn.ev.on("chats.set", async ({ chats }) => {
    try {
      for (let { id, name, readOnly, ...rest } of chats) {
        id = conn.decodeJid(id);
        if (!id || id === "status@broadcast") continue;
        const isGroup = id.endsWith("@g.us");
        let chats = conn.chats[id];
        if (!chats)
          chats = conn.chats[id] = {
            id: id,
          };
        chats.isChats = !readOnly;
        if (name) chats[isGroup ? "subject" : "name"] = name;
        if (isGroup) cacheGroupLocally(conn, { ...(chats.metadata || {}), ...rest, id, jid: id, subject: name || chats.subject, participants: chats.metadata?.participants || [] });
        else global.db?.adapter?.upsertContact?.({ ...rest, jid: id, name });
      }
    } catch (e) {
      console.error(e);
    }
  });
  conn.ev.on(
    "group-participants.update",
    async function updateParticipantsToDb({ id, participants, action }) {
      try {
        if (!id) return;
        id = conn.decodeJid(id);
        if (id === "status@broadcast") return;
        if (!(id in conn.chats))
          conn.chats[id] = {
            id: id,
          };
        const chats = conn.chats[id];
        chats.isChats = true;
        const previous = chats.metadata || global.db?.adapter?.getCachedGroupMetadata?.(id, { maxAge: 0 }) || { id, jid: id, participants: [] };
        const existing = new Map((previous.participants || []).map((p) => [cleanJid(p.jid || p.id), normalizeParticipant(p)]));
        for (const participant of participants || []) {
          const jid = cleanJid(participant.jid || participant.id || participant);
          if (!jid) continue;
          if (action === "remove") {
            existing.delete(jid);
            continue;
          }
          const current = existing.get(jid) || {};
          const normalized = normalizeParticipant(typeof participant === "string" ? { ...current, jid } : { ...current, ...participant, jid });
          if (!normalized) continue;
          if (action === "promote") normalized.admin = "admin";
          if (action === "demote") normalized.admin = undefined;
          existing.set(jid, normalized);
          if (action === "promote" || action === "demote") {
            global.db?.adapter?.updateGroupParticipantAdmin?.(id, normalized, normalized.admin || null);
          }
        }
        const metadata = cacheGroupLocally(conn, { ...previous, id, jid: id, participants: [...existing.values()].filter(Boolean) });
        chats.subject = metadata?.subject || chats.subject;
        chats.metadata = metadata || chats.metadata;
      } catch (e) {
        console.error(e);
      }
    },
  );
  conn.ev.on("chats.upsert", function chatsUpsertPushToDb(chatsUpsert) {
    try {
      const { id, name } = chatsUpsert;
      if (!id || id === "status@broadcast") return;
      conn.chats[id] = {
        ...(conn.chats[id] || {}),
        ...chatsUpsert,
        isChats: true,
      };
      const isGroup = id.endsWith("@g.us");
      if (isGroup) cacheGroupLocally(conn, { ...(conn.chats[id].metadata || {}), ...chatsUpsert, id, jid: id, subject: name || conn.chats[id].subject, participants: conn.chats[id].metadata?.participants || [] });
      else global.db?.adapter?.upsertContact?.({ ...chatsUpsert, jid: id });
    } catch (e) {
      console.error(e);
    }
  });
  conn.ev.on(
    "presence.update",
    async function presenceUpdatePushToDb({ id, presences }) {
      try {
        const sender = Object.keys(presences)[0] || id;
        const _sender = conn.decodeJid(sender);
        const presence = presences[sender]["lastKnownPresence"] || "composing";
        let chats = conn.chats[_sender];
        if (!chats)
          chats = conn.chats[_sender] = {
            id: sender,
          };
        chats.presences = presence;
        global.db?.adapter?.upsertContact?.({ jid: _sender, id: _sender });
        if (id.endsWith("@g.us")) {
          let chats = conn.chats[id];
          if (!chats)
            chats = conn.chats[id] = {
              id: id,
            };
        }
      } catch (e) {
        console.error(e);
      }
    },
  );
}

const KEY_MAP = {
  "pre-key": "preKeys",
  Ellensession: "Ellensessions",
  "sender-key": "senderKeys",
  "app-state-sync-key": "appStateSyncKeys",
  "app-state-sync-version": "appStateVersions",
  "sender-key-memory": "senderKeyMemory",
};

function useSingleFileAuthState(filename, logger) {
  let creds;
  let keys = {};
  let saveCount = 0;
  const saveState = (forceSave) => {
    logger?.trace("saving auth state");
    saveCount++;
    if (forceSave || saveCount > 5) {
      writeFileSync(
        filename,
        JSON.stringify(
          {
            creds: creds,
            keys: keys,
          },
          BufferJSON.replacer,
          2,
        ),
      );
      saveCount = 0;
    }
  };
  if (existsSync(filename)) {
    const result = JSON.parse(
      readFileSync(filename, {
        encoding: "utf-8",
      }),
      BufferJSON.reviver,
    );
    creds = result.creds;
    keys = result.keys;
  } else {
    creds = initAuthCreds();
    keys = {};
  }
  return {
    state: {
      creds: creds,
      keys: {
        get: (type, ids) => {
          const key = KEY_MAP[type];
          return ids.reduce((dict, id) => {
            let value = keys[key][id];
            if (value) {
              if (type === "app-state-sync-key") {
                value = proto.AppStateSyncKeyData.fromObject(value);
              }
              dict[id] = value;
            }
            return dict;
          }, {});
        },
        set: (data) => {
          for (const _key in data) {
            const key = KEY_MAP[_key];
            keys[key] = keys[key] || {};
            Object.assign(keys[key], data[_key]);
          }
          saveState();
        },
      },
    },
    saveState: saveState,
  };
}

function loadMessage(jid, id = null) {
  let message = null;
  if (jid && !id) {
    id = jid;
    const filter = (m) => m.key?.id === id;
    const messages = {};
    const messageFind = Object.entries(messages).find(([, msgs]) => {
      return msgs.find(filter);
    });
    message = messageFind?.[1].find(filter);
  } else {
    jid = jid?.decodeJid?.();
    const messages = {};
    if (!(jid in messages)) return null;
    message = messages[jid].find((m) => m.key.id === id);
  }
  return message ? message : null;
}
export default {
  bind: bind,
  useSingleFileAuthState: useSingleFileAuthState,
  loadMessage: loadMessage,
};
