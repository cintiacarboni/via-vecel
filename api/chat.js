import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ⚠️ PEGÁ ACÁ TODAS LAS INSTRUCCIONES DE VIA (COMPLETAS)
const SYSTEM = `
[ACA PEGARÁS EL BLOQUE DE INSTRUCCIONES DE VIA]
`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { mensaje } = req.body;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: mensaje }
      ]
    });

    res.status(200).json({
      reply: completion.choices[0].message.content,
    });

  } catch (error) {
    console.error("ERROR API VIA:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}
