// ===============================
// VIA – FRONT-END COMPLETO (MULTILENGUAJE)
// ===============================

// ELEMENTOS DEL DOM
const chat = document.getElementById("chat");
const input = document.getElementById("inputMsg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("micBtn");

// BOTONES / SELECTORES
const interpToggle = document.getElementById("interpToggle");
const translateToggle = document.getElementById("translateToggle");
const targetLangSelect = document.getElementById("targetLang");

// ===============================
// ESTADOS
// ===============================
let interpreterMode = false;     // Modo intérprete
let translationMode = false;     // Modo traducción
let recognition = null;          // SpeechRecognition
let speaking = false;            // Si VIA está hablando
let currentTargetLang = "en";    // Idioma destino para TRADUCCIÓN
let userBaseLang = "es";         // Idioma base (Cintia / app)

// Detectamos idioma base del navegador (por si viajero la usa directo)
if (navigator.language) {
  // es-AR → es
  userBaseLang = navigator.language.split("-")[0] || "es";
}

// ===============================
// MAPEO DE IDIOMAS A LOCALES DE VOZ
// (solo afecta a cómo suena la voz, no a la traducción del agente)
// ===============================
function mapLangToLocale(code) {
  switch (code) {
    case "es": return "es-ES";
    case "en": return "en-US";
    case "pt": return "pt-BR";
    case "fr": return "fr-FR";
    case "it": return "it-IT";
    case "de": return "de-DE";
    case "ja": return "ja-JP";
    case "ko": return "ko-KR";
    case "zh": return "zh-CN";  // chino simplificado
    case "ru": return "ru-RU";
    case "ar": return "ar-SA";
    case "hi": return "hi-IN";
    case "nl": return "nl-NL";
    case "sv": return "sv-SE";
    case "pl": return "pl-PL";
    case "tr": return "tr-TR";
    case "he": return "he-IL";
    case "el": return "el-GR";
    default: return "es-ES";
  }
}

// ===============================
// VOZ DE VIA
// ===============================
function speak(text, langCode) {
  if (!("speechSynthesis" in window)) return;

  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);

  // Si no viene lang, usamos idioma base
  const locale = mapLangToLocale(langCode || userBaseLang);

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

    // Cuando termina de hablar, si el modo intérprete/traducción sigue activo,
    // volvemos a prender el micrófono automáticamente
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
function addMessage(text, sender = "via", replyLang = null) {
  const div = document.createElement("div");
  div.classList.add("message", sender);
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;

  // VIA habla solo en modos especiales
  if (sender === "via" && (interpreterMode || translationMode)) {
    // En traducción: usar el idioma destino seleccionado
    // En intérprete / chat: usar el idioma que dice el backend (replyLang),
    // si no viene → idioma base.
    const lang = translationMode
      ? currentTargetLang
      : (replyLang || userBaseLang);

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
    targetLang: translationMode ? currentTargetLang : null,
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
      // data.replyLang viene del backend como código ISO (es, en, fr, ja, ko, etc.)
      addMessage(data.reply, "via", data.replyLang || null);
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
// EVENTOS BÁSICOS
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
// MICROFONO (WEB SPEECH API)
// ===============================
if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  recognition = new SpeechRecognition();

  // Para simplicidad, dejamos reconocimiento en el idioma base del usuario.
  // El agente se encarga de traducir / interpretar internamente.
  recognition.lang = mapLangToLocale(userBaseLang);
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    // Si VIA está hablando, ignoramos lo que se escucha (para que no se escuche a sí misma)
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

    // Si se cortó solo (silencio, etc.) y no está hablando VIA,
    // volvemos a prenderlo SOLO si el modo intérprete/traducción sigue activo
    if ((interpreterMode || translationMode) && !speaking) {
      micBtn.classList.add("listening");
      recognition.start();
    }
  };

  micBtn.addEventListener("click", () => {
    // Si estás en modo intérprete o traducción, el mic ya es automático
    if (interpreterMode || translationMode) {
      addMessage(
        "En modo intérprete / traducción el micrófono se maneja solo. Solo empezá a hablar 😉",
        "via"
      );
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
// MODO INTÉRPRETE (DINÁMICO)
// ===============================
interpToggle.addEventListener("click", () => {
  interpreterMode = !interpreterMode;

  if (interpreterMode) {
    // Apagamos traducción si estaba
    translationMode = false;
    translateToggle.classList.remove("on");
    translateToggle.textContent = "🌍 Traducción: OFF";

    interpToggle.classList.add("on");
    interpToggle.textContent = "🎧 Intérprete: ON";

    // Prendemos mic en automático
    if (recognition && !speaking) {
      micBtn.classList.add("listening");
      recognition.start();
    }

    addMessage(
      "Modo intérprete activado. Hablá natural. Si querés algo específico, podés decir por ejemplo: \"VIA, actuá como intérprete entre mi español y un turista coreano\".",
      "via"
    );
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
    // Apagamos intérprete si estaba
    interpreterMode = false;
    interpToggle.classList.remove("on");
    interpToggle.textContent = "🎧 Intérprete: OFF";

    translateToggle.classList.add("on");
    translateToggle.textContent = "🌍 Traducción: ON";

    if (recognition && !speaking) {
      micBtn.classList.add("listening");
      recognition.start();
    }

    addMessage(
      `Modo traducción activado. Escribí o hablá y lo traduzco a tu idioma destino (${currentTargetLang}).`,
      "via"
    );
  } else {
    translateToggle.classList.remove("on");
    translateToggle.textContent = "🌍 Traducción: OFF";

    if (!interpreterMode && recognition) {
      recognition.stop();
      micBtn.classList.remove("listening");
    }
  }
});


