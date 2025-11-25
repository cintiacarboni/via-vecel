// ===============================
// VIA – FRONT-END COMPLETO
// ===============================

// ELEMENTOS DEL DOM
const chat = document.getElementById("chat");
const input = document.getElementById("inputMsg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("micBtn");

// BOTONES DE MODO
const interpToggle = document.getElementById("interpToggle");
const translateToggle = document.getElementById("translateToggle");

// ===============================
// ESTADOS
// ===============================
let interpreterMode = false;
let translationMode = false;
let recognition = null;

// VIA está hablando por voz
let speaking = false;

// ===============================
// VOZ DE VIA (SIEMPRE EN ESPAÑOL POR DEFECTO)
// El agente maneja los idiomas en texto; la voz la dejamos simple.
// ===============================
function speak(text) {
  if (!("speechSynthesis" in window)) return;

  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);

  // Español neutro como base. El contenido puede estar en otro idioma,
  // pero la prioridad es que Cintia entienda rápido.
  utterance.lang = "es-ES";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  speaking = true;
  synth.cancel();
  synth.speak(utterance);

  utterance.onend = () => {
    speaking = false;
    // Si seguimos en modo intérprete/traducción, vuelve a escuchar
    if (recognition && (interpreterMode || translationMode)) {
      micBtn.classList.add("listening");
      recognition.start();
    }
  };

  utterance.onerror = () => {
    speaking = false;
    if (recognition && (interpreterMode || translationMode)) {
      micBtn.classList.add("listening");
      recognition.start();
    }
  };
}

// ===============================
// AGREGAR MENSAJE AL CHAT
// ===============================
function addMessage(text, sender = "via") {
  const div = document.createElement("div");
  div.classList.add("message", sender);
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;

  // VIA habla solo en modos de voz automáticos
  if (sender === "via" && (interpreterMode || translationMode)) {
    if (recognition) {
      recognition.stop();
      micBtn.classList.remove("listening");
    }
    speak(text);
  }
}

// ===============================
// ENVIAR MENSAJE AL BACKEND
// ===============================
async function sendMessage(source = "text") {
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, "user");
  input.value = "";

  let mode = "chat";
  if (translationMode) mode = "translation";
  else if (interpreterMode) mode = "interpreter";

  const payload = {
    message: text,
    mode,
    source,
  };

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.reply) {
      addMessage(data.reply, "via");
    } else if (data.error) {
      addMessage("Hubo un error: " + data.error, "via");
    } else {
      addMessage("No recibí respuesta de VIA.", "via");
    }
  } catch (err) {
    console.error(err);
    addMessage("Ups, hubo un problema hablando con VIA.", "via");
  }
}

// ===============================
// EVENTOS DE TEXTO
// ===============================
sendBtn.addEventListener("click", () => sendMessage("text"));

input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage("text");
});

// Bienvenida
addMessage(
  "¡Hola! Soy VIA, tu asistente turística para Argentina. Puedo chatear, traducir y actuar como intérprete multilingüe. ¿En qué te ayudo hoy?",
  "via"
);

// ===============================
// MICROFONO
// ===============================
if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  recognition = new SpeechRecognition();
  recognition.lang = "es-ES"; // idioma base de Cintia al hablar
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    if (speaking) return; // para que no se escuche a sí misma

    const texto = event.results[event.results.length - 1][0].transcript;
    input.value = texto;
    sendMessage("voice");
  };

  recognition.onerror = () => {
    if (!interpreterMode && !translationMode) {
      addMessage("No pude escuchar bien. Probá de nuevo.", "via");
    }
  };

  recognition.onend = () => {
    micBtn.classList.remove("listening");
    if ((interpreterMode || translationMode) && !speaking) {
      micBtn.classList.add("listening");
      recognition.start();
    }
  };

  micBtn.addEventListener("click", () => {
    // En modos automáticos, el mic ya se maneja solo
    if (interpreterMode || translationMode) {
      addMessage("El micrófono ya está activo en modo automático.", "via");
      return;
    }
    micBtn.classList.add("listening");
    recognition.start();
  });
} else {
  micBtn.addEventListener("click", () => {
    addMessage("Tu navegador no permite micrófono.", "via");
  });
}

// ===============================
// MODO INTÉRPRETE (DINÁMICO, MULTILINGÜE)
// ===============================
interpToggle.addEventListener("click", () => {
  interpreterMode = !interpreterMode;

  if (interpreterMode) {
    translationMode = false;
    translateToggle.classList.remove("on");
    translateToggle.textContent = "🌍 Traducción: OFF";

    interpToggle.classList.add("on");
    interpToggle.textContent = "🎧 Intérprete: ON";

    addMessage(
      "Modo intérprete activado. Hablá natural. Por ejemplo: \"VIA, actuá como intérprete entre mi español y un turista coreano\" o \"Preguntale en portugués qué lugares quiere visitar\".",
      "via"
    );

    if (recognition && !speaking) {
      micBtn.classList.add("listening");
      recognition.start();
    }
  } else {
    interpToggle.classList.remove("on");
    interpToggle.textContent = "🎧 Intérprete: OFF";

    if (!translationMode && recognition) {
      recognition.stop();
      micBtn.classList.remove("listening");
    }
  }
});

// ===============================
// MODO TRADUCCIÓN (TEXTO / VOZ)
// ===============================
translateToggle.addEventListener("click", () => {
  translationMode = !translationMode;

  if (translationMode) {
    interpreterMode = false;
    interpToggle.classList.remove("on");
    interpToggle.textContent = "🎧 Intérprete: OFF";

    translateToggle.classList.add("on");
    translateToggle.textContent = "🌍 Traducción: ON";

    addMessage(
      "Modo traducción activado. Decime qué querés traducir y a qué idioma. Ejemplo: \"Traducí esto al francés\" o \"Pasalo a inglés para el turista\".",
      "via"
    );

    if (recognition && !speaking) {
      micBtn.classList.add("listening");
      recognition.start();
    }
  } else {
    translateToggle.classList.remove("on");
    translateToggle.textContent = "🌍 Traducción: OFF";

    if (!interpreterMode && recognition) {
      recognition.stop();
      micBtn.classList.remove("listening");
    }
  }
});

