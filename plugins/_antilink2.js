import db from '../database.js'
let linkRegex = /(chat\.whatsapp\.com\/|whatsapp\.com\/channel\/)[0-9A-Za-z]{20,24}|(https?:\/\/(?:www\.|m\.)?(?:youtube\.com|youtu\.be|tiktok\.com|facebook\.com|instagram\.com|twitter\.com|t\.me|drive\.google\.com|docs\.google\.com|wa\.me|open\.spotify\.com|spotify\.link|soundcloud\.com|mediafire\.com|mega\.nz|streamable\.com|vk\.com|reddit\.com|pinterest\.com|snapchat\.com|linkedin\.com|discord\.gg|discordapp\.com\/invite)\/[a-zA-Z0-9\-\._~:\/?#\[\]@!$&'\(\)*+,;=.]+|pastebin\.com\/[a-zA-Z0-9]+|(?:[a-zA-Z0-9-]+\.)+(?:com|net|org|io|app|dev|xyz|info|biz|co|cc|tv|me|us|eu|ru|in|id|jp|fr|de|uk|br|mx|ar|cl|pe|uy|py|bo|ec|gt|cr|sv|hn|ni|pa|cu|do|pr|ve|co|ca)\b(?!\/)?)/gi;

export async function before(m, { conn, isAdmin, isBotAdmin, participants }) {
  if (m.isBaileys && m.fromMe) return true;
  if (!m.isGroup) return false;

  const chat = db.data.chats[m.chat];
  const bot = db.data.settings[this.user.jid] || {};
  const user = `@${m.sender.split('@')[0]}`;
  const delet = m.key.participant;
  const bang = m.key.id;
  const isGroupLink = linkRegex.exec(m.text);

  // Obtener lista actualizada de administradores
  const groupAdmins = participants.filter(p => p.admin);
  const isSenderAdmin = groupAdmins.some(p => p.id === m.sender);

  if (chat.antiLink2 && isGroupLink) {
    // Links permitidos
    const currentGroupLink = `https://chat.whatsapp.com/${await this.groupInviteCode(m.chat)}`;
    const allowedLinks = [
      currentGroupLink,
      'https://www.youtube.com/',
      'https://youtu.be/'
    ];

    // Si es admin, ignorar aunque haya link
    if (isSenderAdmin) {
      return conn.sendMessage(m.chat, {
        text: `✦ El antilink está activo pero te salvaste por ser admin, ${user}.`,
        mentions: [m.sender]
      }, { quoted: m });
    }

    // Si es un link permitido, ignorar
    if (allowedLinks.some(link => m.text.includes(link))) return true;

    // Advertencia
    await conn.sendMessage(m.chat, {
      text: `*「 ANTI LINKS 」*\n\n${user}, has roto las reglas del grupo compartiendo un enlace no permitido. Serás expulsado/a.`,
      mentions: [m.sender]
    }, { quoted: m });

    // No puede expulsar si no es admin
    if (!isBotAdmin) {
      return conn.sendMessage(m.chat, {
        text: `✦ El antilink está activo pero no puedo expulsar a ${user} porque no soy administrador.`,
        mentions: [m.sender]
      }, { quoted: m });
    }

    // Si la opción 'restrict' está desactivada
    if (!bot.restrict) {
      return conn.sendMessage(m.chat, {
        text: `✦ El owner tiene desactivada la opción de *restringir*, así que no puedo expulsar a nadie.`,
        mentions: [m.sender]
      }, { quoted: m });
    }

    // Eliminar mensaje del usuario
    await conn.sendMessage(m.chat, {
      delete: { remoteJid: m.chat, fromMe: false, id: bang, participant: delet }
    });

    // Expulsar al usuario
    try {
      const res = await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
      if (res?.[0]?.status === '404') return;
    } catch (e) {
      console.error('Error al expulsar:', e);
    }
  }

  return true;
}
