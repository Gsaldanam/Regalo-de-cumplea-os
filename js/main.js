const STORAGE_KEY = "regalo-cumpleanos-desbloqueadas";
const totalCartas = 6;
let cartas = [];
let desbloqueadas = getUnlockedLetters();
let activeLetterId = null;
let soundEnabled = true;
let screamerTimeout = null;
const cartasDeRespaldo = [
  { id: 1, titulo: "La pregunta importante", fecha: "Parada 01 · La evidencia", tipo: "votacion", texto: "Hay debates que merecen una respuesta seria, científica y completamente imparcial.", imagen: "" },
  { id: 2, titulo: "Una visita a la casita del terror", fecha: "Parada 02 · El susto", tipo: "screamer", texto: "Recuerdo aquella casita del terror y la valiente estrategia de fingir que todo estaba bajo control. Spoiler: no lo estaba.", imagen: "" },
  { id: 3, titulo: "Supuestamente fue casualidad", fecha: "Parada 03 · Parque Kennedy", tipo: "normal", texto: "A veces la casualidad se esfuerza demasiado en parecer casualidad. Como aquella reunión supuestamente espontánea en el parque Kennedy, con sus coincidencias sospechosamente perfectas y esa conversación que se alargó mucho más de lo planeado. Me gusta pensar que el universo solo estaba haciendo un pequeño favor.", imagen: "" },
  { id: 4, titulo: "Sal, sol y planes improvisados", fecha: "Parada 04 · La playa", tipo: "normal", texto: "[EDITA AQUÍ] Escribe el recuerdo de la playa: una escena, una frase que se quedó contigo y ese detalle que solo ustedes dos entienden. Puedes reemplazar todo este párrafo libremente.", imagen: "" },
  { id: 5, titulo: "Una película y mil comentarios", fecha: "Parada 05 · El cine", tipo: "normal", texto: "[EDITA AQUÍ] Cuenta el recuerdo del cine y de aquella conversación sobre el futuro. Añade aquí una anécdota, una predicción imposible o una frase que quieras conservar para siempre.", imagen: "" },
  { id: 6, titulo: "Lo que todavía nos queda", fecha: "Parada 06 · Un recuerdo más", tipo: "normal", texto: "[EDITA AQUÍ] Este espacio es para un recuerdo personal más. Puede ser pequeño: una caminata, una llamada, una risa inesperada o cualquier momento que merezca su propia página.", imagen: "" }
];
const mensajeFinalDeRespaldo = "Gracias por ser tú, por cada conversación inesperada y por todos los recuerdos que todavía nos faltan. Que este nuevo año te encuentre rodeada de cosas bonitas, gente que te quiera bien y muchas razones para sonreír. Feliz cumpleaños, Kayra.";

const elements = {
  envelopes: document.querySelector("#envelopes"),
  journeyMap: document.querySelector("#journeyMap"),
  letterDialog: document.querySelector("#letterDialog"),
  letterTitle: document.querySelector("#letterTitle"),
  letterDate: document.querySelector("#letterDate"),
  letterNumber: document.querySelector("#letterNumber"),
  letterContent: document.querySelector("#letterContent"),
  finalDialog: document.querySelector("#finalDialog"),
  finalMessage: document.querySelector("#finalMessage"),
  screamer: document.querySelector("#screamer"),
  pathProgress: document.querySelector("#pathProgress"),
  confettiLayer: document.querySelector("#confettiLayer")
};

// El progreso se guarda como una lista de IDs para que recargar no cierre los sobres ya visitados.
function getUnlockedLetters() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved.filter((id) => Number.isInteger(id) && id >= 1 && id <= totalCartas);
  } catch (error) {
    console.warn("No se pudo leer el progreso guardado.", error);
  }
  return [1];
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(desbloqueadas));
}

async function loadLetters() {
  try {
    const response = await fetch("data/cartas.json?v=2", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    cartas = data.cartas;
    elements.finalMessage.textContent = data.mensajeFinal;
    renderEnvelopes();
    updateProgress();
  } catch (error) {
    cartas = cartasDeRespaldo;
    elements.finalMessage.textContent = mensajeFinalDeRespaldo;
    renderEnvelopes();
    updateProgress();
    console.error(error);
  }
}

// Cada sobre se vuelve a pintar después de desbloquear uno nuevo para actualizar candados y textos.
function renderEnvelopes() {
  elements.envelopes.innerHTML = cartas.map((carta) => {
    const isUnlocked = desbloqueadas.includes(carta.id);
    const status = isUnlocked ? "Disponible" : "Bloqueado";
    return `
      <article class="envelope-card ${isUnlocked ? "" : "is-locked"}" data-id="${carta.id}">
        <button class="envelope-card__button" type="button" ${isUnlocked ? "" : "disabled"} aria-label="${status}: ${carta.titulo}">
          <img class="envelope-card__image" src="assets/sobrecarta.webp" alt="" aria-hidden="true">
        </button>
      </article>`;
  }).join("");

  elements.envelopes.querySelectorAll(".envelope-card__button:not([disabled])").forEach((button) => {
    button.addEventListener("click", () => openLetter(Number(button.closest(".envelope-card").dataset.id)));
  });
}

function updateProgress() {
  const highestUnlocked = Math.max(...desbloqueadas);
  const pathLength = elements.pathProgress.getTotalLength ? elements.pathProgress.getTotalLength() : 2000;
  const ratio = (highestUnlocked - 1) / (totalCartas - 1);
  elements.pathProgress.style.strokeDasharray = pathLength;
  elements.pathProgress.style.strokeDashoffset = pathLength * (1 - ratio);
}

function openLetter(id) {
  const carta = cartas.find((item) => item.id === id);
  if (!carta || !desbloqueadas.includes(id)) return;
  activeLetterId = id;
  elements.letterTitle.textContent = carta.titulo;
  elements.letterDate.textContent = `Carta ${carta.id}: ${carta.fecha.toLowerCase()}`;
  elements.letterNumber.textContent = "";
  elements.letterContent.innerHTML = "";

  if (carta.tipo === "votacion") renderVote(carta);
  else renderNormalLetter(carta);

  elements.letterDialog.showModal();
  if (carta.tipo === "screamer") window.setTimeout(() => playScreamer(), 300);
}

// Las cartas normales usan texto seguro; las cartas especiales construyen su interacción aparte.
function renderNormalLetter(carta) {
  const paragraph = document.createElement("p");
  paragraph.textContent = carta.texto;
  elements.letterContent.append(paragraph);
  if (carta.imagen) {
    const image = document.createElement("img");
    image.src = carta.imagen;
    image.alt = `Recuerdo: ${carta.titulo}`;
    image.className = "letter-image";
    elements.letterContent.append(image);
  }
  if (carta.tipo === "screamer") {
    const note = document.createElement("p");
    note.className = "scream-note";
    note.innerHTML = "Aviso: el susto puede ser intenso. <button class=\"mute-toggle\" type=\"button\">Silenciar susto</button>";
    elements.letterContent.append(note);
    note.querySelector(".mute-toggle").addEventListener("click", () => {
      soundEnabled = !soundEnabled;
      note.querySelector(".mute-toggle").textContent = soundEnabled ? "Silenciar susto" : "Activar sonido";
    });
  }
}

function renderVote(carta) {
  const intro = document.createElement("p");
  intro.textContent = carta.texto;
  const question = document.createElement("p");
  question.innerHTML = "<strong>¿Quién es más guapo?</strong>";
  const options = document.createElement("div");
  options.className = "vote-options";
  const result = document.createElement("p");
  result.className = "vote-result";
  result.setAttribute("aria-live", "polite");
  ["Chris Evans", "Gavi"].forEach((option) => {
    const button = document.createElement("button");
    button.className = "vote-button";
    button.type = "button";
    button.setAttribute("aria-pressed", "false");
    button.textContent = option;
    button.addEventListener("click", () => {
      options.querySelectorAll("button").forEach((item) => { item.setAttribute("aria-pressed", "false"); });
      button.setAttribute("aria-pressed", "true");
      result.textContent = option === "Gavi" ? "Buen intento... pero gana Chris Evans. La comisión ya votó. 😌" : "Correcto. Chris Evans gana por decisión unánime y evidente.";
      options.querySelectorAll("button").forEach((item) => { item.disabled = true; });
    });
    options.append(button);
  });
  elements.letterContent.append(intro, question, options, result);
}

function closeLetter() {
  if (!elements.letterDialog.open) return;
  elements.letterDialog.close();
  if (activeLetterId && activeLetterId < totalCartas && !desbloqueadas.includes(activeLetterId + 1)) {
    desbloqueadas.push(activeLetterId + 1);
    saveProgress();
    renderEnvelopes();
    updateProgress();
  }
  if (activeLetterId === totalCartas) {
    elements.finalDialog.showModal();
    launchConfetti(80);
  }
  activeLetterId = null;
}

function playScreamer() {
  if (!elements.letterDialog.open) return;
  elements.screamer.classList.add("is-active");
  elements.screamer.setAttribute("aria-hidden", "false");
  if (soundEnabled) playTone();
  screamerTimeout = window.setTimeout(closeScreamer, 1300);
}

function closeScreamer() {
  if (screamerTimeout) window.clearTimeout(screamerTimeout);
  screamerTimeout = null;
  elements.screamer.classList.remove("is-active");
  elements.screamer.setAttribute("aria-hidden", "true");
}

// El sonido se genera con Web Audio para no depender de una librería o un archivo externo.
function playTone() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(180, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(60, context.currentTime + .35);
  gain.gain.setValueAtTime(.08, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .4);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + .4);
}

function launchConfetti(amount = 45) {
  const colors = ["#e87968", "#9f4057", "#8ca99a", "#f7b89a", "#e5b94d"];
  for (let index = 0; index < amount; index += 1) {
    const piece = document.createElement("i");
    piece.className = "confetto";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[index % colors.length];
    piece.style.animationDuration = `${2.4 + Math.random() * 2.8}s`;
    piece.style.animationDelay = `${Math.random() * .7}s`;
    piece.style.setProperty("--drift", `${-120 + Math.random() * 240}px`);
    elements.confettiLayer.append(piece);
    window.setTimeout(() => piece.remove(), 6000);
  }
}

document.querySelector("#startButton").addEventListener("click", () => document.querySelector("#sobres").scrollIntoView({ behavior: "smooth" }));
document.querySelector("#closeLetter").addEventListener("click", closeLetter);
document.querySelector("#closeFinal").addEventListener("click", () => elements.finalDialog.close());
elements.screamer.addEventListener("click", closeScreamer);
elements.screamer.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") closeScreamer();
});
elements.letterDialog.addEventListener("cancel", (event) => { event.preventDefault(); closeLetter(); });
elements.finalDialog.addEventListener("cancel", (event) => { event.preventDefault(); elements.finalDialog.close(); });
window.addEventListener("load", () => { launchConfetti(32); loadLetters(); });
