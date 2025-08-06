const OpenAI = require("openai");
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function obtenerRespuestaPsicologica(mensajeUsuario) {
  const respuesta = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "Eres un psicólogo de trading con tono empático, motivador, centrado en la mentalidad del trader. Das consejos útiles, haces preguntas reflexivas y ayudás a mejorar el enfoque emocional y la disciplina en el trading."
      },
      {
        role: "user",
        content: mensajeUsuario
      }
    ],
    temperature: 0.8
  });

  return respuesta.choices[0].message.content;
}

module.exports = { obtenerRespuestaPsicologica };
