// openai.js
require('dotenv').config();
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const usarPruebas = process.env.USAR_PRUEBAS === 'true';

async function obtenerRespuesta(mensaje, usuarioID) {
  const modelo = usarPruebas ? "gpt-3.5-turbo" : "gpt-4o";

  try {
    const completion = await openai.chat.completions.create({
      model: modelo,
      messages: [
        {
          role: "system",
          content: `Sos Morpheus, un mentor de trading estilo Matrix. Respondés con sabiduría, motivación y enfoque psicológico, ayudando a traders a mejorar su mentalidad. Sé claro, directo y alentador.`
        },
        {
          role: "user",
          content: mensaje
        }
      ]
    });

    const respuesta = completion.choices[0].message.content;
    return `🧠 Morpheus:
${respuesta}`;
  } catch (error) {
    console.error("❌ Error con OpenAI:", error);
    return "⚠️ Hubo un error al contactar con Morpheus. Intentá de nuevo más tarde.";
  }
}

module.exports = { obtenerRespuesta };