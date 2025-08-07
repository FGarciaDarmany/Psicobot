const cheerio = require('cheerio');
const axios = require('axios');

const URL = 'https://www.forexfactory.com/calendar';

const MONEDA_PRIORIDAD = ["eur", "gbp", "xau"];
const ORDEN_ACTIVOS = [
  "eurusd", "gbpusd", "xauusd",
  "usdjpy", "usdcad", "audusd", "nzdusd", "usdchf",
  "eurgbp", "eurjpy", "eurchf", "gbpjpy", "gbpchf", "chfjpy", "audjpy", "nzdjpy"
];

// Emoji banderitas
const FLAGS = {
  usd: "🇺🇸 USD",
  eur: "🇪🇺 EUR",
  gbp: "🇬🇧 GBP",
  jpy: "🇯🇵 JPY",
  aud: "🇦🇺 AUD",
  nzd: "🇳🇿 NZD",
  cad: "🇨🇦 CAD",
  chf: "🇨🇭 CHF",
  cny: "🇨🇳 CNY"
};

function obtenerBanderaYAbreviacion(moneda) {
  return FLAGS[moneda.toLowerCase()] || `🏳️ ${moneda.toUpperCase()}`;
}

async function obtenerNoticias() {
  try {
    const response = await axios.get(URL);
    const $ = cheerio.load(response.data);

    const noticiasPorActivo = {};

    $('tr.calendar__row--high').each((_, el) => {
      const time = $(el).find('.calendar__time').text().trim();
      const currency = $(el).find('.calendar__currency').text().trim().toLowerCase();
      const impact = "🔥 Alto impacto";
      const evento = $(el).find('.calendar__event-title').text().trim();
      const hora = time !== '' ? time : '🕐 Pendiente';

      if (!currency || !evento) return;

      const flag = obtenerBanderaYAbreviacion(currency);

      const mensaje = `• ${flag} - **${evento}** (${hora})`;

      for (const par of ORDEN_ACTIVOS) {
        if (par.includes(currency)) {
          if (!noticiasPorActivo[par]) noticiasPorActivo[par] = [];
          noticiasPorActivo[par].push(mensaje);
        }
      }
    });

    // Armar salida ordenada
    let salidaFinal = "```ansi\n\u001b[1;33m📊 NOTICIAS DE ALTO IMPACTO\n\u001b[0m```";
    for (const activo of ORDEN_ACTIVOS) {
      const noticias = noticiasPorActivo[activo];
      if (noticias && noticias.length > 0) {
        salidaFinal += `\n🟦 **${activo.toUpperCase()}**\n${noticias.join('\n')}\n`;
      }
    }

    return salidaFinal.trim();

  } catch (error) {
    console.error("❌ Error al obtener noticias:", error.message);
    return "⚠️ Error al obtener noticias desde ForexFactory.";
  }
}

module.exports = { obtenerNoticias };
