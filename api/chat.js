import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const { message, mensaje } = req.body || {};
    const texto = message || mensaje;

    if (!texto) {
      return res.status(400).json({ error: "Falta mensaje" });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Sos VIA, asistente turística para Argentina." },
        { role: "user", content: texto },
      ],
    });

    const reply = completion.choices[0].message.content;
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("ERROR VIA:", error);
    return res.status(500).json({ error: "Error al conectar con VIA" });
  }
}



