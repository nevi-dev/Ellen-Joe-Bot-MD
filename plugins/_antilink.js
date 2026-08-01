import db from '../database.js'
let linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i;
let linkRegex1 = /whatsapp\.com\/channel\/([0-9A-Za-z]{20,24})/i;

// Caché de invitaciones
let cachedGroupLinks = {}

async function getCachedGroupInviteCode(conn, chatId) {
  if (cachedGroupLinks[chatId]) return cachedGroupLinks[chatId]
  const code = await conn.groupInviteCode(chatId)
  const fullLink = `https://chat.whatsapp.com/${code}`
  cachedGroupLinks[chatId] = fullLink
  setTimeout(() => delete cachedGroupLinks[chatId], 10 * 60 * 1000)
  return fullLink
}

export async function before(m, { conn, isAdmin, isBotAdmin, isOwner, isROwner, participants }) {
  if (!m.isGroup) return;

  if (isAdmin || isOwner || m.fromMe || isROwner) return;

  let chat = db.data.chats[m.chat];
  if (!chat.antiLink) return;

  const user = `@${m.sender.split('@')[0]}`;
  const groupAdmins = participants.filter(p => p.admin);
  const isSenderAdmin = groupAdmins.some(p => p.id === m.sender);
  const isGroupLink = linkRegex.exec(m.text) || linkRegex1.exec(m.text);

  if (isGroupLink) {
    try {
      const currentGroupLink = await getCachedGroupInviteCode(conn, m.chat);
      if (m.text.includes(currentGroupLink)) return;

      if (isSenderAdmin) {
        return m.reply(`✦ El antilink está activo pero te salvaste por ser admin.`);
      }

      await conn.sendMessage(m.chat, {
        text: `*「 ENLACE DETECTADO 」*\n\n《✧》${user} rompiste las reglas del grupo y serás eliminado...`,
        mentions: [m.sender]
      }, { quoted: m });

      if (!isBotAdmin) {
        return conn.sendMessage(m.chat, {
          text: `✦ El antilink está activo pero no puedo eliminar a ${user} porque no soy admin.`,
          mentions: [...groupAdmins.map(v => v.id)]
        }, { quoted: m });
      }

      await conn.sendMessage(m.chat, {
        delete: { remoteJid: m.chat, fromMe: false, id: m.key.id, participant: m.key.participant }
      });

      const res = await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
      if (res[0]?.status === "404") return; // Usuario ya no está

    } catch (e) {
      console.error('Error en antilink:', e);
    }
  }

  return true;
}
