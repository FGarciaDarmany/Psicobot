// scraperNoticias.js
const axios = require('axios');
const cheerio = require('cheerio');
const { DateTime } = require('luxon');

// Lista ordenada por prioridad de activos
const prioridadActivos = [
  'EUR', 'GBP', 'USD', 'JPY', 'CAD', 'CHF', 'AUD', 'NZD',
  'CNY', 'HKD', 'SGD', 'ZAR', 'MXN', 'BRL'
];

// Mapa de banderas
const banderas = {
  EUR: '🇪🇺', GBP: '🇬🇧', USD: '🇺🇸', JPY: '🇯🇵', CAD: '🇨🇦', CHF: '🇨🇭',
  AUD: '🇦🇺', NZD: '🇳🇿', CNY: '🇨🇳', HKD: '🇭🇰', SGD: '🇸🇬', ZAR: '🇿🇦',
  MXN: '🇲🇽', BRL: '🇧🇷'
};

// Scrapea el calendario económico de ForexFactory
async function obtenerNoticias(fecha = 'today') {
  try {
    const url = `https://www.forexfactory.com/calendar?day=${fecha}`;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const noticias = [];
    let horaActual = null;

    $('#calendar__table .calendar__row').each((_, row) => {
      const impacto = $(row).find('.calendar__impact span').attr('class');
      if (!impacto || !impacto.includes('high')) return; // Solo alto impacto

      const hora = $(row).find('.calendar__time').text().trim();
      const divisa = $(row).find('.calendar__currency').text().trim();
      const evento = $(row).find('.calendar__event').text().trim();

      // Guardar última hora si está vacía (forexfactory usa celdas vacías para eventos agrupados)
      if (hora !== '') horaActual = hora;

      // Convertir hora a Paraguay (UTC-3)
      const horaLuxon = DateTime.fromFormat(horaActual, 'h:mm a', { zone: 'America/New_York' });
      const horaParaguay = horaLuxon.setZone('America/Asuncion');

      noticias.push({
        hora: horaParaguay.toFormat('HH:mm'),
        divisa,
        evento,
        bandera: banderas[divisa] || '',
        impacto: 'alto'
      });
    });

    // Ordenar por prioridad de divisa
    noticias.sort((a, b) => {
      return prioridadActivos.indexOf(a.divisa) - prioridadActivos.indexOf(b.divisa);
    });

    return noticias;
  } catch (error) {
    console.error('❌ Error al obtener noticias:', error.message);
    return [];
  }
}

module.exports = { obtenerNoticias };
