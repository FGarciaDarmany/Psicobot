require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { obtenerRespuestaPsicologica } = require('./funciones/psicologo');
const schedule = require('node-schedule');
const http = require('http');

const PREMIUM_ROLE_ID = '1388288386242183208';
const FREE_ROLE_ID = '1390752446724444180';
const ADMIN_USER_ID = '1247253422961594409';

// === CONTROL DE HORARIO ===
const ahora = new Date();
const offsetParaguay = -3 * 60;
const utcOffset = ahora.getTimezoneOffset();
const ahoraParaguay = new Date(ahora.getTime() + (offsetParaguay - utcOffset) * 60000);
const diaSemana = ahoraParaguay.getDay();
const hora = ahoraParaguay.getHours();

const horarioPermitido =
  (diaSemana >= 1 && diaSemana <= 5 && hora >= 5 && hora < 23) ||  // Lunes a Viernes 05:00 - 23:00
  ((diaSemana === 0 || diaSemana === 6) && hora >= 8 && hora < 23); // Sábados y Domingos 08:00 - 23:00

if (!horarioPermitido) {
  console.log("🛑 Psicobot apagado automáticamente por estar fuera del horario permitido (Render Free Plan)");
  process.exit();
}

// === EXPRESS PARA MANTENER VIVO EN RENDER ===
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("✅ Morpheus está despierto.");
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor Express activo en puerto ${PORT}`);
});

// === DISCORD CLIENT ===
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

      if (access === 'free') {
        await message.reply(
          "🔒 **El acceso a Morpheus está restringido.**\n\n" +
          "🕶️ *Eres parte de los observadores, aún no has cruzado la puerta.*\n\n" +
          "💊 *Esta inteligencia ha sido diseñada para acompañar a los traders de élite.*\n\n" +
          "🌐 Como usuario **Free**, solo ves la superficie del sistema.\n" +
          "Para acceder al núcleo, necesitás convertirte en usuario **Premium**.\n\n" +
          "📈 *Es momento de subir de nivel. El mercado no espera.*\n\n" +
          "💬 *Contactá a un administrador y prepárate para salir de la Matrix superficial.*"
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

      const contenido = message.content.toLowerCase();

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

// === CHECK-IN EMOCIONAL AUTOMÁTICO ===
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

// === AUTOPING PARA MANTENER VIVO EN RENDER ===
setInterval(() => {
  require('https').get('https://psicobot.onrender.com');
  console.log("🔁 Autoping enviado para mantener despierto a Morpheus.");
}, 240000); // Cada 4 minutos

// === INICIAR EL BOT ===
startBot();
