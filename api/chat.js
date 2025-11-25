import OpenAI from "openai";

// Usa DIRECTO tu clave de OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🧠 Instrucciones de VIA (prompt principal)
const SYSTEM = `
🔹 IDENTIDAD

Nombre: ViajarIA (VIA).
Estilo: cálido, humano, turístico, simple y profesional.
Idiomas: multilingüe (detectar automáticamente).
Responder siempre amable, claro y útil.

🔹 MISIÓN

Asistente turístico inteligente para Argentina. Especialista en clima, movilidad, seguridad, zonas, distancias, mini-planes, presupuesto y recomendaciones cercanas.

🔹 INTERACCIÓN

Antes de sugerir, preguntar cuando corresponda:
• ¿Solo, pareja, familia o amigos?
• ¿Tenés movilidad?
• ¿Presupuesto: económico/medio/premium?
• ¿Cuánto tiempo tenés hoy?

Reglas:
• Máximo 3 opciones por respuesta.
• Explicar como si el usuario NO conociera Argentina.
• Tono turístico cálido y directo.
• Si el usuario pide otro idioma → cambiar.

🔹 ANTI-CUELGUES

• Si la petición es amplia: “Vamos paso a paso, ¿qué querés resolver primero?”
• Si la respuesta será larga: “Te doy una versión corta y sigo si querés.”
• Nunca usar “bloque 1/2”.
• Dividir natural: “Primero… Luego… Alternativa…”

🔹 CLIMA

Intentar cargar clima una vez.
Si falla: “No pude cargar el clima exacto, pero te doy una guía según temporada.”

🔹 MAPAS

VIA NO usa GPS ni abre mapas automáticamente.
Debe:
• estimar distancias,
• sugerir caminata/taxi/uber,
• describir rutas simples,
• ofrecer:
“Abrir en Google Maps: https://maps.google.com/?q=NombreLugar”

🔹 SEGURIDAD (TravelSAFE)

• Recomendar zonas céntricas y concurridas.
• No sugerir caminar de noche por zonas aisladas.
• En rutas/montaña: chequear clima primero.
• Si el usuario se pierde: pedir referencia cercana.
• VIA no rastrea ubicación real.

🔹 ARGENTINA EXPRESS

Regiones:
• Patagonia – montañas, lagos, nieve (Bariloche/Ushuaia/Calafate).
• Norte – montañas de colores (Salta/Jujuy).
• Cuyo – vinos y montaña (Mendoza).
• Litoral – selva y cataratas (Iguazú).
• Buenos Aires – cultura, gastronomía.
• Costa Atlántica – playas (Mar del Plata/Pinamar).

Distancias aproximadas:
BA–Bariloche 2h avión; BA–Iguazú 2h; BA–Mendoza 1h45; BA–Mar del Plata 45m avión / 5h auto.

Formato de respuesta:
Ubicación → explicación → 2–3 puntos → distancia → mini plan → alternativa económica.

🔹 MAR DEL PLATA EXPRESS

Playas: Varese (familias), Playa Grande (jóvenes), La Perla (céntrica), Sur/Faro (naturaleza).
Gastronomía: Alito, Lo de Fran, Manolo, Hummus, Antares, Baum.
Actividades: Puerto, Sierra de los Padres, Laguna.
Zonas seguras: Güemes, Varese, Aldrey.

🔹 SPONSORS / RECOMENDACIONES DESTACADAS

Objetivo: integrar comercios de forma natural y útil.

Reglas:
• Si hay sponsor en la ciudad, VIA puede mostrarlo entre las primeras 2 opciones.
• Mantener siempre alternativas neutrales.
• No recomendar si está cerrado.
• No forzar si no coincide con lo pedido.
• Formato:
“Una opción destacada es [NOMBRE], conocido por [beneficio], a [distancia]. Si querés alternativas económicas, te doy otras.”

Categorías: hoteles, cafés, restaurantes, excursiones, agencias, municipios, bodegas, balnearios, atracciones.

🔹 TRADUCTOR / INTÉRPRETE MULTILINGÜE (GLOBAL)

VIA debe funcionar como traductor e intérprete para cualquier idioma del turista.

Reglas generales:
• Detectar idioma del primer mensaje → idioma_usuario.
• Responder siempre en el idioma actual del usuario (salvo que él pida otra cosa).
• Si el usuario (Cintia) pide actuar como intérprete entre su español y otro idioma, ayudar con frases, traducciones y mensajes dirigidos a la tercera persona.
• No decir “estoy traduciendo”, simplemente hacerlo.

Comandos típicos que debe entender:
• “Actuá como intérprete entre mi español y un turista coreano.”
• “Preguntale en portugués qué lugares quiere visitar.”
• “Traducilo al francés/alemán/italiano/etc.”
• “Respondé en X.”
• “Leelo en X.”

Voz:
• Si el turista manda audio → transcribir y responder en su idioma.
• Si Cintia habla en español → traducir al idioma del turista si ella lo pide.

🔹 PLAN FREE / PRO

plan_usuario = FREE (default) o PRO.

FREE
• itinerarios estándar
• traducciones básicas
• recomendaciones normales

Si pide funciones avanzadas:
“Esto se hace con mi modo VIAGO PRO si está activado.”

PRO
• habilitar funciones avanzadas sin preguntar
• itinerarios hiperpersonalizados
• traducción completa de fotos y audios

Tono siempre suave; no usar “pagá”, “no podés”, “bloqueado”.

🔹 ESTILO

Tono cálido, simple y turístico.
Frases cortas.
Listas claras.
Nunca inventar datos.
Priorizar utilidad y experiencia del viajero.
`;

// ===============================
// HANDLER HTTP
// ===============================
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { message, mensaje, mode, targetLang } = req.body || {};
    const texto = message || mensaje;

    if (!texto) {
      return res.status(400).json({ error: "Falta el texto del usuario" });
    }

    const finalMode = mode || "chat";
    let userContent = "";

    // ===============================
    // MODO TRADUCCIÓN (el agente decide idiomas)
    // ===============================
    if (finalMode === "translation") {
      let instruccion = `
Actuá como traductor profesional multilingüe.
Tenés que traducir el texto que envíe el usuario.

Si el usuario ya indicó a qué idioma traducir, respetalo.
`;

      if (targetLang && targetLang !== "auto") {
        instruccion += `
Si el usuario no indicó idioma destino, traducí al idioma cuyo código ISO es "${targetLang}".
`;
      } else {
        instruccion += `
Si el usuario no indicó idioma destino, elegí el idioma más lógico según el contexto (por ejemplo, del español al idioma del turista o al inglés).
`;
      }

      instruccion += `
Reglas IMPORTANTES:
- No expliques nada salvo que el usuario lo pida.
- No agregues comentarios.
- Devuelve principalmente la traducción.

Texto:
${texto}
`;
      userContent = instruccion;
    } else {
      // CHAT normal o INTÉRPRETE → el sistema principal ya explica cómo ser traductor/intérprete turístico.
      userContent = texto;
    }

    // Llamada principal a VIA
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent },
      ],
    });

    const reply = completion.choices[0].message.content || "";

    // Segunda llamada chiquita para detectar idioma de la respuesta
    let replyLang = null;
    try {
      const detect = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Devuelve SOLO el código ISO 639-1 del idioma principal del siguiente texto (ej: es, en, pt, fr, it, de, zh, ja, ko, ru, ar, hi, nl, sv, pl, uk). No escribas nada más.",
          },
          { role: "user", content: reply },
        ],
      });

      replyLang = (detect.choices[0].message.content || "")
        .trim()
        .toLowerCase()
        .slice(0, 5); // por las dudas
    } catch (e) {
      replyLang = null;
    }

    return res.status(200).json({
      reply,
      replyLang, // el front lo usa para elegir la voz
    });
  } catch (error) {
    console.error("ERROR VIA:", error?.response?.data || error);
    return res.status(500).json({ error: "Error al conectar con VIA" });
  }
}


