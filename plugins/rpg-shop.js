import db from '../database.js'
import { recordWalletIncome } from '../lib/economy.js'
const xppercoin = 350;
const handler = async (m, {conn, command, args}) => {
  let count = command.replace(/^buy/i, '');
  count = count ? /all/i.test(count) ? Math.floor(db.data.users[m.sender].exp / xppercoin) : parseInt(count) : args[0] ? parseInt(args[0]) : 1;
  count = Math.max(1, count);
  if (db.data.users[m.sender].exp >= xppercoin * count) {
    db.data.users[m.sender].exp -= xppercoin * count;
    recordWalletIncome(m.sender, db.data.users[m.sender], count, 'Compra de monedas con XP', 'shop')
    conn.reply(m.chat, `
╔═══════⩽✰⩾═══════╗
║    𝐍𝐨𝐭𝐚 𝐃𝐞 𝐏𝐚𝐠𝐨 
╠═══════⩽✰⩾═══════╝
║╭──────────────┄
║│ *Compra Nominal* : + ${count} 💸
║│ *Gastado* : -${xppercoin * count} XP
║╰──────────────┄
╚═══════⩽✰⩾═══════╝`, m);
  } else conn.reply(m.chat, `${emoji2} Lo siento, no tienes suficiente *XP* para comprar *${count}* ${moneda} 💸`, m);
};
handler.help = ['Buy', 'Buyall'];
handler.tags = ['economy'];
handler.command = ['buy', 'buyall'];
handler.group = true;
handler.register = true;

export default handler;
