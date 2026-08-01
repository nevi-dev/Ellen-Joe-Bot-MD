import db from '../database.js'
export async function before(m) {
  if (!m.text || !global.prefix.test(m.text) || !m.isGroup) return;

  let data = db.data;
  let users = data.users;
  
  // --- CÁLCULO DE ESTADO ECONÓMICO ---
  let totalCirculante = 0;
  let conteo = 0;
  for (let id in users) {
    totalCirculante += (users[id].coin || 0) + (users[id].bank || 0);
    conteo++;
  }

  const baseIdeal = conteo * 25000; // Ajusta este número según tu bot
  let ratio = totalCirculante / (baseIdeal || 1);
  
  if (!data.economy) data.economy = {};
  
  // Factor de inflación (Exponencial para que sea inestable)
  data.economy.inflation = parseFloat(Math.pow(ratio, 1.2).toFixed(2));

  // --- DEFINICIÓN DE ESTADOS ---
  let estado = "ESTABLE";
  let multiplicadorRecompensa = 1.0; // Cuánto ganan en comandos de dinero

  if (data.economy.inflation > 5.0) {
    estado = "HIPERINFLACIÓN";
    // En hiperinflación, el bot da MUCHÍSIMO dinero (lo que empeora todo, como en la vida real)
    multiplicadorRecompensa = 5.0; 
  } else if (data.economy.inflation > 1.5) {
    estado = "INFLACIÓN";
    multiplicadorRecompensa = 1.5;
  } else if (data.economy.inflation < 0.7) {
    estado = "DEFLACIÓN";
    // En deflación nadie tiene dinero, el bot da muy poco para que el valor suba
    multiplicadorRecompensa = 0.5;
  }

  data.economy.state = estado;
  data.economy.rewardModifier = multiplicadorRecompensa;
  
  // Guardamos el circulante para el comando de reporte
  data.economy.totalCoins = totalCirculante;
}
