require('dotenv').config();
const express = require('express');
const fs = require('fs');
const schedule = require('node-schedule');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { obtenerRespuestaPsicologica } = require('./funciones/psicologo');
const { obtenerNoticias } = require('./scraper');

// === CONFIG ===
const PREMIUM_ROLE_ID = '1388288386242183208';
const FREE_ROLE_ID    = '1390752446724444180';
const ADMIN_USER_ID   = '1247253422961594409';
const CANAL_ALERTAS_ID= '1403015672794976366';

const TZ = 'America/Asuncion';

// === UTIL: horario permitido (NO mata el proceso) ===
function horarioPermitidoAhora() {
  const ahora = new Date();
  // Convertir a hora PY usando Intl (evita errores de offset)
  const fmt = new Intl.DateTimeFormat('es-PY', { hour: '2-digit', weekday: 'short', hour12: false, timeZone: TZ });
  const parts = fmt.formatToParts(ahora);
  const hh = parseInt(parts.find(p => p.type === 'hour').value, 10);
  const wk = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: TZ }).format(ahora); // Sun..Sat
  const map = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
  const d = map[wk];

  const habil =
    ((d >= 1 && d <= 5) && hh >= 5 && hh < 23) ||
    ((d === 0 || d === 6) && hh >= 8 && hh < 23);

  return habil;
}

// === EXPRESS KEEP-ALIVE ===
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => res.status(200).send('✅ The Architect running'));
app.get('/health', (_req, res) => res.status(200).send('ok'));

app.listen(PORT, () => {
  console.log(`🌐 Keep-alive server escuchando en ${PORT}`);
});

// === DISCORD CLIENT ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,   // por si luego escuchas en canales
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.once('ready', () => {
  console.log(`✅ Bot iniciado como ${client.user.tag}`);
  client.user.setPresence({
    status: 'online',
    activities: [{ name: 'LIT + noticias en tiempo real', type: 3 }]
  });

  programarEnvios();
  programarRecordatorios();
});

// — Logs de conexión para diagnosticar —
client.on('shardDisconnect', (e, id) => console.warn(`🧩 Shard ${id} disconnected:`, e?.code));
client.on('shardError', (err, id) => console.error(`🧩 Shard ${id} error:`, err));
client.on('error', err => console.error('Client error:', err));
client.on('warn', m => console.warn('Warn:', m));

// === MENSAJERÍA ===
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === '!noticias') {
    if (!horarioPermitidoAhora()) return message.reply('⏱️ Fuera del horario operativo.');
    const noticias = await obtenerNoticias();
    return message.channel.send(noticias);
  }

  // DM (type 1)
  if (message.channel.type === 1) {
    const access = await checkUserAccess(message.author.id);
    if (access === 'free')  return message.reply('🔒 Acceso restringido. Contactá a un admin.');
    if (access === 'denied')return message.reply('⚠️ Servicio exclusivo para Premium.');

    const contenido = message.content.toLowerCase();
    if (contenido.includes('comencemos el día') || contenido.includes('comencemos el dia')) {
      return message.reply(
        "💊 **BIENVENIDO, OPERADOR.**\n" +
        "🧠 *Enfoque:* setups claros.\n" +
        "🎯 *Meta:* disciplina.\n" +
        "🧘 *Emoción:* calma anticipada.\n" +
        "⏱️ *Horario operativo:* 05:00–23:00 (PY)."
      );
    }

    try {
      const respuesta = await obtenerRespuestaPsicologica(contenido);
      await message.reply(respuesta);
    } catch (e) {
      console.error('❌ Error IA:', e.message);
      await message.reply('⚠️ No pude procesar tu mensaje.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);

// === ROLES ===
async function checkUserAccess(userId) {
  try {
    for (const [, guild] of client.guilds.cache) {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member) {
        if (member.roles.cache.has(PREMIUM_ROLE_ID)) return 'premium';
        if (member.roles.cache.has(FREE_ROLE_ID))    return 'free';
      }
    }
    return 'denied';
  } catch (e) {
    console.error('❌ Error verificando rol:', e.message);
    return 'denied';
  }
}

// === SCHEDULERS (con TZ y sin matar proceso) ===
function programarEnvios() {
  // Dom 18:30 — semanal
  schedule.scheduleJob({ tz: TZ, rule: '30 18 * * 0' }, () => enviarNoticias('semanales'));
  // Lun–Vie 05:00 y 08:30 — diarias
  schedule.scheduleJob({ tz: TZ, rule: '0 5 * * 1-5' },  () => enviarNoticias('diarias'));
  schedule.scheduleJob({ tz: TZ, rule: '30 8 * * 1-5' }, () => enviarNoticias('diarias'));

  // Reinicio “soft” 04:50 (no mata; solo reinicia schedules si hiciera falta)
  schedule.scheduleJob({ tz: TZ, rule: '50 4 * * *' }, () => {
    console.log('🔄 (soft) mantenimiento 04:50 — no se apaga el proceso');
  });

  // Autoping cada 4 min a tu PROPIO servicio
  const target = (process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '') || 'https://the-architect-ru7k.onrender.com';
  setInterval(async () => {
    try {
      await fetch(`${target}/health`);
      console.log(`🔁 Autoping OK -> ${target}/health`);
    } catch (e) {
      console.error('⚠️ Autoping error:', e.message);
    }
  }, 240000);
}

async function enviarNoticias(tipo) {
  try {
    if (!horarioPermitidoAhora()) {
      console.log(`⏱️ ${tipo}: fuera de horario, no envío.`);
      return;
    }
    const noticias = await obtenerNoticias();

    const canal = await client.channels.fetch(CANAL_ALERTAS_ID).catch(() => null);
    if (canal) await canal.send(noticias);

    const usuariosPremium = fs.existsSync('PREMIUM.txt')
      ? fs.readFileSync('PREMIUM.txt', 'utf-8').split('\n').filter(Boolean)
      : [];
    for (const id of usuariosPremium) {
      try {
        const user = await client.users.fetch(id.trim());
        await user.send(noticias);
      } catch (e) {
        console.error(`❌ DM a ${id}:`, e.message);
      }
    }
    console.log(`📤 Noticias ${tipo} enviadas.`);
  } catch (err) {
    console.error('❌ Error al enviar noticias:', err.message);
  }
}

async function programarRecordatorios() {
  try {
    const noticias = await obtenerNoticias();
    const lineas = noticias.split('\n');

    for (const linea of lineas) {
      const match = linea.match(/• (.*?) - \*\*(.*?)\*\* \((\d{1,2}):(\d{2})\)/);
      if (!match) continue;

      const [, flag, evento, hh, mm] = match;
      // Fecha PY
      const ahora = new Date();
      const fechaPY = new Date(new Intl.DateTimeFormat('en-US', {
        timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
      }).format(ahora).replace(',', ''));
      fechaPY.setHours(parseInt(hh) , parseInt(mm) - 10, 0, 0);

      // Convertir a UTC date equivalente
      const when = new Date(fechaPY.toLocaleString('en-US', { timeZone: 'UTC' }));

      if (when <= new Date()) continue;

      schedule.scheduleJob({ tz: 'UTC', start: when, rule: `${when.getUTCMinutes()} ${when.getUTCHours()} ${when.getUTCDate()} ${when.getUTCMonth()+1} *` }, async () => {
        if (!horarioPermitidoAhora()) return;

        const mensaje = `🚨 **Recordatorio: Noticia de Alto Impacto**\n${flag} - **${evento}** en 10 minutos.`;
        try {
          const canal = await client.channels.fetch(CANAL_ALERTAS_ID);
          if (canal) await canal.send(mensaje);
        } catch (e) {
          console.error('❌ Error canal alertas:', e.message);
        }

        const usuarios = fs.existsSync('PREMIUM.txt')
          ? fs.readFileSync('PREMIUM.txt','utf-8').split('\n').filter(Boolean)
          : [];
        for (const id of usuarios) {
          try {
            const user = await client.users.fetch(id.trim());
            await user.send(mensaje);
          } catch (e) {
            console.error(`❌ Recordatorio a ${id}:`, e.message);
          }
        }
        console.log(`⏰ Recordatorio enviado: ${evento} (${hh}:${mm})`);
      });
    }
  } catch (e) {
    console.error('❌ Error programando recordatorios:', e.message);
  }
}
