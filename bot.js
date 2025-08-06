const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { obtenerRespuestaPsicologica } = require('./funciones/psicologo');
const schedule = require('node-schedule');
require('dotenv').config();

let client;

function startBot() {
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
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
