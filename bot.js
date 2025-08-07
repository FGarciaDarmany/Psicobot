require('dotenv').config();
const express = require('express');
const fs = require('fs');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { obtenerRespuestaPsicologica } = require('./funciones/psicologo');
const { obtenerNoticias } = require('./scraper');
const schedule = require('node-schedule');

// === VARIABLES CLAVE ===
const PREMIUM_ROLE_ID = '1388288386242183208';
const FREE_ROLE_ID = '1390752446724444180';
const ADMIN_USER_ID = '1247253422961594409';
const CANAL_ALERTAS_ID = '1403015672794976366';

// === CONTROL DE HORARIO ===
const ahora = new Date();
const offsetParaguay = -3 * 60;
const utcOffset = ahora.getTimezoneOffset();
const ahoraParaguay = new Date(ahora.getTime() + (offsetParaguay - utcOffset) * 60000);
const diaSemana = ahoraParaguay.getDay();
const hora = ahoraParaguay.getHours();

const horarioPermitido =
  (diaSemana >= 1 && diaSemana <= 5 && hora >= 5 && hora < 23) || 
  ((diaSemana === 0 || diaSemana === 6) && hora >= 8 && hora < 23);

if (!horarioPermitido) {
  console.log("🛑 Psicobot apagado por fuera del horario permitido");
  process.exit();
}

// === EXPRESS KEEP ALIVE ===
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("✅ Morpheus está despierto."));
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
    if (message.author.bot) return;

    // === Comando !noticias manual ===
    if (message.content === '!noticias') {
      const noticias = await obtenerNoticias();
      await message.channel.send(noticias);
      return;
    }

    // === Si es un DM ===
    if (message.channel.type === 1) {
      const access = await checkUserAccess(message.author.id);
      if (access === 'free') {
        await message.reply("🔒 El acceso a Morpheus está restringido. Contactá a un administrador.");
        return;
      }
      if (access === 'denied') {
        await message.reply("⚠️ Este servicio es exclusivo para usuarios Premium. Contactá a un administrador.");
        return;
      }

      const contenido = message.content.toLowerCase();
      if (contenido.includes("comencemos el día")) {
        await message.reply(
          "💊 **BIENVENIDO DE NUEVO, OPERADOR.**\n\n" +
          "🧠 ACTIVANDO PROTOCOLO DE MENTALIDAD...\n" +
          "🔹 *Enfoque:* setups claros.\n" +
          "🔹 *Meta:* disciplina.\n" +
          "🔹 *Emoción:* 🧘 Calma anticipada.\n" +
          "🚨 *Horario operativo:* 05:00 a 23:59.\n" +
          "💬 *Te hablaré al mediodía para el check-in.*"
        );
        return;
      }

      try {
        const respuesta = await obtenerRespuestaPsicologica(contenido);
        await message.reply(respuesta);
      } catch (error) {
        console.error('❌ Error al generar respuesta:', error.message);
        await message.reply('⚠️ No pude procesar tu mensaje.');
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
    console.error("❌ Error verificando rol:", error.message);
    return 'denied';
  }
}

// === CHECK-IN EMOCIONAL 12:30 ===
schedule.scheduleJob('30 12 * * *', async () => {
  if (client) {
    const usuario = await client.users.fetch(ADMIN_USER_ID);
    if (usuario) {
      try {
        await usuario.send(
          "☀️ **Check-in emocional 🧠**\nYa es mediodía. ¿Operaste con disciplina?\n💬 *Hablamos si necesitás apoyo.*"
        );
        console.log("📩 Check-in enviado a Fernando.");
      } catch (error) {
        console.error("❌ No se pudo enviar el check-in:", error.message);
      }
    }
  }
});

// === ENVÍO AUTOMÁTICO DE NOTICIAS ===

// Domingos 18:30 - Semana
schedule.scheduleJob('30 18 * * 0', async () => {
  await enviarNoticias("semanales");
});

// Lunes a Viernes 05:00 y 08:30 - Día
schedule.scheduleJob('0 5 * * 1-5', async () => {
  await enviarNoticias("diarias");
});
schedule.scheduleJob('30 8 * * 1-5', async () => {
  await enviarNoticias("diarias");
});

async function enviarNoticias(tipo) {
  try {
    const noticias = await obtenerNoticias();
    const canal = await client.channels.fetch(CANAL_ALERTAS_ID);
    if (canal) await canal.send(noticias);

    const usuariosPremium = fs.readFileSync('PREMIUM.txt', 'utf-8').split('\n').filter(Boolean);
    for (const id of usuariosPremium) {
      try {
        const user = await client.users.fetch(id.trim());
        await user.send(noticias);
      } catch (e) {
        console.error(`❌ No se pudo enviar DM a ${id}:`, e.message);
      }
    }

    console.log(`📤 Noticias ${tipo} enviadas.`);
  } catch (err) {
    console.error("❌ Error al enviar noticias:", err.message);
  }
}

// === AUTOPING KEEP ALIVE ===
setInterval(() => {
  require('https').get('https://psicobot.onrender.com');
  console.log("🔁 Autoping enviado.");
}, 240000); // Cada 4 minutos

// === INICIAR BOT ===
startBot();
