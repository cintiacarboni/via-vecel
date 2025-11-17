const chat = document.getElementById("chat");
const input = document.getElementById("inputMsg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("micBtn");

// 👉 Agrega un mensaje al chat
function addMessage(text, sender = "via") {
  const div = document.createElement("div");
  div.classList.add("message", sender);
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// 👉 Enviar mensaje al backend /api/chat
async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  // Muestra el mensaje del usuario
  addMessage(text, "user");
  input.value = "";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }), // el backend lee "message"
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

// Eventos: click y Enter
sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// 🟦 Mensaje de bienvenida
addMessage("¡Hola! Soy VIA, tu asistente turística para Argentina. ¿En qué te ayudo hoy?", "via");

// 🎤 MICROFONO – Web Speech API
let recognition = null;

if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = "es-ES"; // idioma base (podés cambiarlo)
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const texto = event.results[0][0].transcript;
    input.value = texto;
    sendMessage(); // envía automáticamente lo que se dijo
  };

  recognition.onerror = (event) => {
    console.error("Error micrófono:", event.error);
    addMessage("No pude escuchar bien. Probá de nuevo.", "via");
  };

  recognition.onend = () => {
    micBtn.classList.remove("listening");
  };
}

micBtn.addEventListener("click", () => {
  if (!recognition) {
    addMessage("Tu navegador no permite usar micrófono.", "via");
    return;
  }

  micBtn.classList.add("listening");
  recognition.start();
});

