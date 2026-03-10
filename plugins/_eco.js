export async function before(m) {
  if (!m.text || !global.prefix.test(m.text) || !m.isGroup) return;

  let db = global.db.data;
  let users = db.users;
  
  // --- CÁLCULO DE ESTADO ECONÓMICO ---
  let totalCirculante = 0;
  let conteo = 0;
  for (let id in users) {
    totalCirculante += (users[id].coin || 0) + (users[id].bank || 0);
    conteo++;
  }

  const baseIdeal = conteo * 25000; // Ajusta este número según tu bot
  let ratio = totalCirculante / (baseIdeal || 1);
  
  if (!db.economy) db.economy = {};
  
  // Factor de inflación (Exponencial para que sea inestable)
  db.economy.inflation = parseFloat(Math.pow(ratio, 1.2).toFixed(2));

  // --- DEFINICIÓN DE ESTADOS ---
  let estado = "ESTABLE";
  let multiplicadorRecompensa = 1.0; // Cuánto ganan en comandos de dinero

  if (db.economy.inflation > 5.0) {
    estado = "HIPERINFLACIÓN";
    // En hiperinflación, el bot da MUCHÍSIMO dinero (lo que empeora todo, como en la vida real)
    multiplicadorRecompensa = 5.0; 
  } else if (db.economy.inflation > 1.5) {
    estado = "INFLACIÓN";
    multiplicadorRecompensa = 1.5;
  } else if (db.economy.inflation < 0.7) {
    estado = "DEFLACIÓN";
    // En deflación nadie tiene dinero, el bot da muy poco para que el valor suba
    multiplicadorRecompensa = 0.5;
  }

  db.economy.state = estado;
  db.economy.rewardModifier = multiplicadorRecompensa;
  
  // Guardamos el circulante para el comando de reporte
  db.economy.totalCoins = totalCirculante;
}
