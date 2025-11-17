import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const { message } = req.body;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres VIA, una asistente turística inteligente para Argentina. Respondes claro, breve y práctico. Ayudas con destinos, clima, alojamiento, rutas, transporte, costos y traducción básica. No inventes links de reserva.",
        },
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices[0].message.content;
    res.status(200).json({ reply });
  } catch (error) {
    console.error("Error en VIA:", error);
    res.status(500).json({ error: "Error procesando la solicitud" });
  }
}
