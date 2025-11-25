// ===============================
// VIA – FRONT-END COMPLETO
// ===============================

// ELEMENTOS DEL DOM
const chat = document.getElementById("chat");
const input = document.getElementById("inputMsg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("micBtn");

// BOTONES NUEVOS (DEBEN EXISTIR EN EL HTML)
const interpToggle = document.getElementById("interpToggle");
const translateToggle = document.getElementById("translateToggle");
const targetLangSelect = document.getElementById("targetLang");

// ===============================
// ESTADOS
// ===============================
let interpreterMode = false;
let translationMode = false;
let recognition = null;
let currentTargetLang = "en"; // idioma destino por defecto (podés cambiarlo)

// 👇 NUEVO: bandera para saber si VIA está hablando
let speaking = false;

// ===============================
// MAPEO DE IDIOMAS (para la voz)
// ===============================
function mapLangToLocale(code) {
  switch (code) {
    case "es":
      return "es-ES";
    case "en":
      return "en-US";
    case "pt":
      return "pt-BR";
    case "fr":
      return "fr-FR";
    case "it":
      return "it-IT";
    // si agregás más idiomas en el select, podés extender acá
    default:
      return "es-ES";
  }
}

// ===============================
// VOZ DE VIA
// ===============================
function speak(text, langCode) {
  if (!("speechSynthesis" in window)) return;

  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  const locale = mapLangToLocale(langCode || "es");

  utterance.lang = locale;
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voices = synth.getVoices();
  const preferredVoice =
    voices.find((v) => v.lang === locale) ||
    voices.find((v) => v.lang.startsWith(locale.split("-")[0]));

  if (preferredVoice) utterance.voice = preferredVoice;

  // VIA va a hablar
  speaking = true;

  synth.cancel();
  synth.speak(utterance);

  utterance.onend = () => {
    speaking = false;
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
function addMessage(text, sender = "via", replyLang = "es") {
  const div = document.createElement("div");
  div.classList.add("message", sender);
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;

  // VIA habla solo si hay modo intérprete o traducción activo
  if (sender === "via" && (interpreterMode || translationMode)) {
    const lang = translationMode ? currentTargetLang : replyLang || "es";

    // Antes de hablar, apagamos el mic para que no se escuche a sí misma
    if (recognition) {
      recognition.stop();
      micBtn.classList.remove("listening");
    }

    speak(text, lang);
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
    // 👇 AQUÍ EL CAMBIO IMPORTANTE:
    // en traducción o intérprete mandamos el idioma destino
    targetLang: translationMode || interpreterMode ? currentTargetLang : null,
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
      addMessage(data.reply, "via", data.replyLang || "es");
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
// EVENTOS
// ===============================
sendBtn.addEventListener("click", () => sendMessage("text"));

input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage("text");
});

// Bienvenida
addMessage(
  "¡Hola! Soy VIA, tu asistente turística para Argentina. ¿En qué te ayudo hoy?",
  "via"
);

// ===============================
// MICROFONO
// ===============================
if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  recognition = new SpeechRecognition();
  recognition.lang = "es-ES";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    // Si VIA está hablando, ignoramos lo que se escucha
    if (speaking) return;

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
// MODO INTÉRPRETE
// ===============================
interpToggle.addEventListener("click", () => {
  interpreterMode = !interpreterMode;

  if (interpreterMode) {
    translationMode = false;
    translateToggle.classList.remove("on");
    translateToggle.textContent = "🌍 Traducción: OFF";

    interpToggle.classList.add("on");
    interpToggle.textContent = "🎧 Intérprete: ON";

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
// MODO TRADUCCIÓN
// ===============================
targetLangSelect.addEventListener("change", () => {
  currentTargetLang = targetLangSelect.value;
});

translateToggle.addEventListener("click", () => {
  translationMode = !translationMode;

  if (translationMode) {
    interpreterMode = false;
    interpToggle.classList.remove("on");
    interpToggle.textContent = "🎧 Intérprete: OFF";

    translateToggle.classList.add("on");
    translateToggle.textContent = "🌍 Traducción: ON";

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


