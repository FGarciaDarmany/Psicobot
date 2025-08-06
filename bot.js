require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { obtenerRespuestaPsicologica } = require('./funciones/psicologo');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel] // Necesario para recibir DMs
});

client.once('ready', () => {
  console.log(`🧠 Psicobot conectado como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.channel.type === 1 && !message.author.bot) {
    console.log(`📩 Mensaje recibido por DM de ${message.author.username}: ${message.content}`);

    try {
      const respuesta = await obtenerRespuestaPsicologica(message.content);
      await message.reply(respuesta);
    } catch (error) {
      console.error('❌ Error al generar respuesta:', error.message);
      message.reply('⚠️ Lo siento, ocurrió un error al procesar tu mensaje. Intenta nuevamente más tarde.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
