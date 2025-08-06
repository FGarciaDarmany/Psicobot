const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { obtenerRespuestaPsicologica } = require('./funciones/psicologo');
const schedule = require('node-schedule');
require('dotenv').config();

const PREMIUM_ROLE_ID = '1388288386242183208';
const FREE_ROLE_ID = '1390752446724444180';
const ADMIN_USER_ID = '1247253422961594409';

let client;

function startBot() {
  client = new Client({
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
  });

  client.on('messageCreate', async (message) => {
    if (message.channel.type === 1 && !message.author.bot) {
      const access = await checkUserAccess(message.author.id);

      // 🔒 Si es usuario Free
      if (access === 'free') {
        await message.reply(
          "🔒 **El acceso a Morpheus está restringido.**\n\n" +
          "🕶️ *Eres parte de los observadores, aún no has cruzado la puerta.*\n\n" +
          "💊 *Esta inteligencia ha sido diseñada para acompañar a los traders de élite —aquellos que eligieron la pastilla roja del compromiso, la disciplina y la mentalidad profesional.*\n\n" +
          "🌐 Como usuario **Free**, solo ves la superficie del sistema.\n" +
          "Para acceder al núcleo, necesitás convertirte en usuario **Premium**.\n\n" +
          "🔓 Al hacerlo, desbloquearás a *Morpheus*:\n" +
          "• Psicólogo de trading\n" +
          "• Mentor emocional\n" +
          "• Coach mental diario\n" +
          "• Análisis personalizado\n" +
          "• Disciplina automatizada\n\n" +
          "📈 *Es momento de subir de nivel. El mercado no espera.*\n\n" +
          "💬 *Contactá a un administrador y prepárate para salir de la Matrix superficial.*"
        );
        return;
      }

      // ❌ Si no es ni Free ni Premium
      if (access === 'denied') {
        await message.reply(
          "⚠️ Este servicio es **exclusivo para usuarios Premium**.\n" +
          "Para obtener acceso, contactá a un administrador."
        );
        return;
      }

      const contenido = message.content.toLowerCase();

      // 🟢 COMANDO ESPECIAL: "comencemos el día"
      if (contenido.includes("comencemos el día")) {
        await message.reply(
          "💊 **BIENVENIDO DE NUEVO, OPERADOR.**\n\n" +
          "🧠 ACTIVANDO PROTOCOLO DE MENTALIDAD PARA EL TRADER DE ALTO RENDIMIENTO...\n\n" +
          "🔹 *Enfoque:* SOLO operar setups claros.\n" +
          "🔹 *Meta de hoy:* Mantener la disciplina.\n" +
          "🔹 *Emoción dominante:* 🧘 Calma anticipada.\n" +
          "🔹 *Recordatorio:* El mercado no se controla, se interpreta.\n\n" +
          "🚨 *Hoy operás desde las 05:00 hasta las 23:59.*\n" +
          "💬 *Te hablaré al mediodía para hacer check-in.*\n\n" +
          "☕ ¿Listo para ejecutar como un profesional?"
        );
        return;
      }

      // 🧠 RESPUESTA PSICOLÓGICA NORMAL
      try {
        const respuesta = await obtenerRespuestaPsicologica(contenido);
        await message.reply(respuesta);
      } catch (error) {
        console.error('❌ Error al generar respuesta:', error.message);
        await message.reply('⚠️ No pude procesar tu mensaje. Revisá tu cuenta o conexión.');
      }
    }
  });

  client.login(process.env.DISCORD_TOKEN);
}

// 🔍 Verifica si el usuario tiene el rol Premium, Free o ninguno
async function checkUserAccess(userId) {
  try {
    for (const [guildId, guild] of client.guilds.cache) {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member) {
        if (member.roles.cache.has(PREMIUM_ROLE_ID)) return 'premium';
        if (member.roles.cache.has(FREE_ROLE_ID)) return 'free';
      }
    }
    return 'denied';
  } catch (error) {
    console.error("❌ Error verificando rol del usuario:", error.message);
    return 'denied';
  }
}

function stopBot() {
  if (client) {
    console.log("🛑 Morpheus desconectado (23:59)");
    client.destroy();
    client = null;
  }
}

// 🕓 Encender todos los días a las 05:00 (hora del servidor)
schedule.scheduleJob('0 5 * * *', () => {
  console.log("⏰ Iniciando Morpheus");
  startBot();
});

// 🕛 Apagar a las 23:59
schedule.scheduleJob('59 23 * * *', () => {
  console.log("⏰ Apagando Morpheus");
  stopBot();
});

// 🟢 Keep Alive: mantener vivo el bot mientras está encendido
setInterval(() => {
  if (client && client.ws.status === 0) {
    console.log("💓 Morpheus sigue activo...");
  }
}, 1000 * 60 * 14); // Cada 14 minutos

// ⏰ Rutina diaria: check-in emocional a las 12:30
schedule.scheduleJob('30 12 * * *', async () => {
  if (client) {
    const usuario = await client.users.fetch(ADMIN_USER_ID);
    if (usuario) {
      try {
        await usuario.send(
          "☀️ **Check-in emocional 🧠**\n\n" +
          "Ya es mediodía. ¿Cómo va tu operativa hasta ahora?\n\n" +
          "🔹 ¿Operaste según tu plan?\n" +
          "🔹 ¿Te sentís emocionalmente en control?\n" +
          "🔹 ¿Necesitás pausar y respirar?\n\n" +
          "💬 *Respondeme si querés que hablemos un rato. Estoy para ayudarte.*"
        );
        console.log("📩 Check-in enviado a Fernando a las 12:30");
      } catch (error) {
        console.error("❌ No se pudo enviar el DM del check-in:", error.message);
      }
    }
  }
});
