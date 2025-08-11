// === Morpheus (Psicobot) — Render-ready ===
require('dotenv').config();
const express = require('express');
const https = require('https');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const schedule = require('node-schedule');
const { obtenerRespuestaPsicologica } = require('./funciones/psicologo');

const PREMIUM_ROLE_ID = '1388288386242183208';
const FREE_ROLE_ID    = '1390752446724444180';
const ADMIN_USER_ID   = '1247253422961594409';

// ===== Timezone & horario =====
const TZ = 'America/Asuncion';
function horarioPermitidoAhora() {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: TZ }).format(now); // Sun..Sat
  const hourStr = new Intl.DateTimeFormat('en-US', { hour: '2-digit', hour12: false, timeZone: TZ }).format(now);
  const hour = parseInt(hourStr, 10);
  const d = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 }[weekday];

  // Lun–Vie 05:00–23:00 | Sáb–Dom 08:00–23:00
  const laboral = (d >= 1 && d <= 5) && hour >= 5 && hour < 23;
  const finde   = (d === 0 || d === 6) && hour >= 8 && hour < 23;
  return laboral || finde;
}

// ===== Express keep-alive =====
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => res.status(200).send('🧠 Morpheus está en línea'));
app.get('/health', (_req, res) => res.status(200).send('ok'));

app.listen(PORT, () => {
  console.log(`🌐 Servidor Express corriendo en puerto ${PORT}`);
});

// ===== Discord client (una sola instancia) =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.once('ready', () => {
  console.log(`🧠 Morpheus activo como ${client.user.tag}`);
  client.user.setPresence({
    status: 'online',
    activities: [{ name: 'Psicología de trading + LIT', type: 3 }] // WATCHING
  });

  // Schedules con TZ
  programarCheckIn();
});

// Logs útiles
client.on('shardDisconnect', (e, id) => console.warn(`🧩 Shard ${id} disconnected:`, e?.code));
client.on('shardError', (err, id) => console.error(`🧩 Shard ${id} error:`, err));
client.on('error', err => console.error('Client error:', err));
client.on('warn',  m  => console.warn('Warn:', m));

// ===== Mensajería (DMs) =====
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Solo DMs (ChannelType.DM === 1 en v14)
  if (message.channel.type !== 1) return;

  const access = await checkUserAccess(message.author.id);

  if (access === 'free') {
    await message.reply(
      "🔒 **El acceso a Morpheus está restringido.**\n\n" +
      "🕶️ *Eres parte de los observadores, aún no has cruzado la puerta.*\n\n" +
      "💊 *Esta IA acompaña a traders que eligieron la pastilla roja: compromiso, disciplina y mentalidad profesional.*\n\n" +
      "🌐 Como usuario **Free**, solo ves la superficie del sistema.\n" +
      "Para acceder al núcleo, necesitás convertirte en **Premium**.\n\n" +
      "🔓 Desbloqueás a *Morpheus*:\n" +
      "• Psicólogo de trading\n" +
      "• Mentor emocional\n" +
      "• Coach mental diario\n" +
      "• Análisis personalizado\n" +
      "• Disciplina automatizada\n\n" +
      "📈 *Es momento de subir de nivel. El mercado no espera.*\n" +
      "💬 Contactá a un administrador."
    );
    return;
  }

  if (access === 'denied') {
    await message.reply(
      "⚠️ Este servicio es **exclusivo para usuarios Premium**.\n" +
      "Para obtener acceso, contactá a un administrador."
    );
    return;
  }

  // Si es Premium, respetar franja horaria
  if (!horarioPermitidoAhora()) {
    await message.reply('⏱️ *Fuera del horario operativo (PY). Vuelvo a estar activo en la próxima franja.*');
    return;
  }

  // Flujos rápidos
  const contenido = message.content.toLowerCase();

  if (contenido.includes("comencemos el día") || contenido.includes("comencemos el dia")) {
    await message.reply(
      "💊 **BIENVENIDO DE NUEVO, OPERADOR.**\n\n" +
      "🧠 ACTIVANDO PROTOCOLO DE MENTALIDAD PARA EL TRADER DE ALTO RENDIMIENTO...\n\n" +
      "🔹 *Enfoque:* SOLO operar setups claros.\n" +
      "🔹 *Meta de hoy:* Mantener la disciplina.\n" +
      "🔹 *Emoción dominante:* 🧘 Calma anticipada.\n" +
      "🔹 *Recordatorio:* El mercado no se controla, se interpreta.\n\n" +
      "⏱️ *Horario operativo (PY):* Lun–Vie 05:00–23:00 | Sáb–Dom 08:00–23:00.\n" +
      "💬 *Te hablaré al mediodía para hacer check-in.*\n\n" +
      "☕ ¿Listo para ejecutar como un profesional?"
    );
    return;
  }

  try {
    const respuesta = await obtenerRespuestaPsicologica(contenido);
    await message.reply(respuesta);
  } catch (error) {
    console.error('❌ Error al generar respuesta:', error.message);
    await message.reply('⚠️ No pude procesar tu mensaje. Revisá tu cuenta o conexión.');
  }
});

// ===== Login =====
client.login(process.env.DISCORD_TOKEN);

// ===== Roles =====
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
  } catch (error) {
    console.error("❌ Error verificando rol del usuario:", error.message);
    return 'denied';
  }
}

// ===== Check-in emocional 12:30 (PY) =====
function programarCheckIn() {
  schedule.scheduleJob({ tz: TZ, rule: '30 12 * * *' }, async () => {
    try {
      const usuario = await client.users.fetch(ADMIN_USER_ID);
      await usuario.send(
        "☀️ **Check-in emocional 🧠**\n\n" +
        "Ya es mediodía. ¿Cómo va tu operativa hasta ahora?\n\n" +
        "🔹 ¿Operaste según tu plan?\n" +
        "🔹 ¿Te sentís emocionalmente en control?\n" +
        "🔹 ¿Necesitás pausar y respirar?\n\n" +
        "💬 *Respondeme si querés que hablemos un rato. Estoy para ayudarte.*"
      );
      console.log("📩 Check-in enviado a Fernando a las 12:30 (PY)");
    } catch (error) {
      console.error("❌ No se pudo enviar el DM del check-in:", error.message);
    }
  });
}

// ===== Autoping (mantener despierto el servicio) =====
const base = (process.env.RENDER_EXTERNAL_URL || process.env.AUTOPING_URL || '').replace(/\/$/, '');
const autopingTarget = base ? `${base}/health` : null;

if (autopingTarget) {
  setInterval(() => {
    https.get(autopingTarget, res => {
      if (res.statusCode === 200) console.log(`🔁 Autoping OK -> ${autopingTarget}`);
      else console.warn(`⚠️ Autoping status ${res.statusCode} -> ${autopingTarget}`);
    }).on('error', err => console.error('⚠️ Autoping error:', err.message));
  }, 240000); // cada 4 minutos
} else {
  console.log('ℹ️ AUTOPING desactivado (define RENDER_EXTERNAL_URL o AUTOPING_URL para habilitarlo).');
}

// ===== Heartbeat de conexión Discord (opcional) =====
setInterval(() => {
  if (client?.ws?.status === 0) console.log('💓 Morpheus sigue activo...');
}, 1000 * 60 * 14);
