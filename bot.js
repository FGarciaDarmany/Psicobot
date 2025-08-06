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
      try {
        const respuesta = await obtenerRespuestaPsicologica(message.content);
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

// 🕓 Encender todos los días a las 05:00 (hora del servidor, debe estar en UTC o configurado)
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
}, 1000 * 60 * 14); // Cada 14 minutos (Render desconecta a los 15)

