const chat = document.getElementById("chat");
const input = document.getElementById("inputMsg");
const sendBtn = document.getElementById("send");

sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

function addMessage(text, sender) {
  const div = document.createElement("div");
  div.className = sender;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, "user");
  input.value = "";

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text }),
  });

  const data = await res.json();
  addMessage(data.reply, "via");
}
// 🎤 MICROFONO – Speech to Text
const micBtn = document.getElementById("micBtn");

let recognition;
if ("webkitSpeechRecognition" in window) {
    recognition = new webkitSpeechRecognition();
    recognition.lang = "es-ES";    // idioma base
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = function (event) {
        const texto = event.results[0][0].transcript;
        input.value = texto; 
        sendMessage(); 
    };

    recognition.onerror = function (event) {
        console.error("Error micrófono:", event.error);
        addMessage("No pude escuchar bien. Probá de nuevo.", "via");
    };
}

micBtn.addEventListener("click", () => {
    if (!recognition) {
        addMessage("Tu navegador no permite usar micrófono.", "via");
        return;
    }

    recognition.start();
    micBtn.style.background = "#00aaff";
    micBtn.textContent = "🎙️";

    recognition.onend = () => {
        micBtn.style.background = "";
        micBtn.textContent = "🎤";
    };
});

