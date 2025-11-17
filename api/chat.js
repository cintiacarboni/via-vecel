import OpenAI from "openai";

// 👇 Usa DIRECTO tu clave de OpenAI, NO AI Gateway
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🧠 Instrucciones de VIA (pegá acá tu prompt completo, versión optimizada)
const SYSTEM = `
[PEGÁ ACÁ TODO EL TEXTO DE INSTRUCCIONES DE VIA]
`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    // El front manda { message: "texto" } – por las dudas acepto "mensaje" también
    const { message, mensaje } = req.body || {};
    const texto = message || mensaje;

    if (!texto) {
      return res.status(400).json({ error: "Falta el texto del usuario" });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: texto },
      ],
    });

    const reply = completion.choices[0].message.content;

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("ERROR VIA:", error?.response?.data || error);
    // No sabemos el código exacto, pero devolvemos 500 para el front
    return res.status(500).json({ error: "Error al conectar con VIA" });
  }
}
