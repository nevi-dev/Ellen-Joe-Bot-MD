import { createHash } from 'crypto';
import fetch from 'node-fetch';
import moment from 'moment-timezone';

let handler = async (m, { conn, text }) => {
  // Definición de emojis y moneda (asumiendo que son variables globales)
  const emoji = '✨', emoji2 = '❌';
  const moneda = '💸'; // Placeholder para la moneda

  let user = global.db.data.users[m.sender];
  
  // 1. No hay texto (Ellen Joe: Despectiva)
  if (!text) return conn.reply(m.chat, `『🎄』${emoji2} ¿Crees que esto es un mercado de pulgas? Dame el valor y el tiempo exacto. Ejemplo: *#comprarpremium 1 día*. ¡No pierdas mi tiempo, el tiempo es dinero!`, m);

  let [amount, unit] = text.split(' ');
  amount = parseInt(amount);
  
  // 2. Cantidad inválida (Ellen Joe: Condescendiente)
  if (isNaN(amount)) return conn.reply(m.chat, `『🦈』${emoji2} ¿Acaso no sabes contar? La *cantidad* debe ser un número entero. ¡Vuelve a la escuela!`, m);
  
  const units = { minuto: 1, minutos: 1, hora: 60, horas: 60, dia: 1440, dias: 1440 };
  
  // 3. Unidad de tiempo inválida (Ellen Joe: Exigente)
  if (!units[unit.toLowerCase()]) return conn.reply(m.chat, `『🎁』${emoji2} ¡Unidad de tiempo no reconocida! Solo acepto: *minutos*, *horas* o *días*. ¿Es tan difícil ser preciso?`, m);

  // *Nota: La lógica de coste por 200 sigue siendo la misma.
  let cost = amount * (units[unit.toLowerCase()] / 200); 

  // 4. Fondos insuficientes (Ellen Joe: Desinteresada)
  if (user.coin < cost) return conn.reply(m.chat, `『❄️』${emoji2} *Fondos insuficientes.* Necesitas *${cost}* ${moneda} para esta *adquisición premium*. Vuelve cuando tu cartera refleje tu ambición, no tu pobreza.`, m);

  // Realizar la transacción
  user.coin -= cost;
  user.premium = true;
  user.premiumTime = +new Date() + amount * units[unit.toLowerCase()] * 60 * 1000; 
  
  // 5. Éxito (Ellen Joe: Transaccional y Sarcástica)
  conn.reply(m.chat, `『🌟』¡Transacción exitosa! Has *invertido* *${cost}* ${moneda} en tu estatus. Disfruta de tu acceso **Premium** por *${amount} ${unit}*. Ahora que eres valioso, no me decepciones. ¡Felices Fiestas Exclusivas!`, m);
};

handler.help = ['comprarpremium'];
handler.tags = ['premium'];
handler.command = ['comprarpremium', 'premium', 'vip'];
handler.register = true;

export default handler;
