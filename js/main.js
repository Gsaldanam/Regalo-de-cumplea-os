const STORAGE_KEY = "regalo-cumpleanos-desbloqueadas";
const totalCartas = 6;
let cartas = [];
let desbloqueadas = getUnlockedLetters();
let activeLetterId = null;
let sequenceTimeouts = [];
let audioContext = null;
let toastTimer = null;
const cartasDeRespaldo = [
  { id: 1, titulo: "La pregunta importante", fecha: "Parada 01 · La evidencia", tipo: "votacion", texto: "Hay debates que merecen una respuesta seria, científica y completamente imparcial.", imagen: "" },
  { id: 2, titulo: "Una visita a la casita del terror", fecha: "Parada 02 · El susto", tipo: "screamer", texto: "Recuerdo aquella casita del terror y la valiente estrategia de fingir que todo estaba bajo control. Spoiler: no lo estaba.", imagen: "" },
  { id: 3, titulo: "Supuestamente fue casualidad", fecha: "Parada 03 · Parque Kennedy", tipo: "normal", texto: "A veces la casualidad se esfuerza demasiado en parecer casualidad. Como aquella reunión supuestamente espontánea en el parque Kennedy, con sus coincidencias sospechosamente perfectas y esa conversación que se alargó mucho más de lo planeado. Me gusta pensar que el universo solo estaba haciendo un pequeño favor.", imagen: "assets/carta-3-videojuegos.png", imagenesLaterales: ["assets/carta-3-captura-izquierda.jpg", "assets/carta-3-captura-derecha.jpg"] },
  { id: 4, titulo: "Sal, sol y planes improvisados", fecha: "Parada 04 · La playa", tipo: "normal", texto: "[EDITA AQUÍ] Escribe el recuerdo de la playa: una escena, una frase que se quedó contigo y ese detalle que solo ustedes dos entienden. Puedes reemplazar todo este párrafo libremente.", imagen: "" },
  { id: 5, titulo: "Una película y mil comentarios", fecha: "Parada 05 · El cine", tipo: "normal", texto: "[EDITA AQUÍ] Cuenta el recuerdo del cine y de aquella conversación sobre el futuro. Añade aquí una anécdota, una predicción imposible o una frase que quieras conservar para siempre.", imagen: "" },
  { id: 6, titulo: "Lo que todavía nos queda", fecha: "Parada 06 · Un recuerdo más", tipo: "normal", texto: "[EDITA AQUÍ] Este espacio es para un recuerdo personal más. Puede ser pequeño: una caminata, una llamada, una risa inesperada o cualquier momento que merezca su propia página.", imagen: "" }
];
const mensajeFinalDeRespaldo = "Gracias por ser tú, por cada conversación inesperada y por todos los recuerdos que todavía nos faltan. Que este nuevo año te encuentre rodeada de cosas bonitas, gente que te quiera bien y muchas razones para sonreír. Feliz cumpleaños, Kayra.";

const elements = {
  envelopes: document.querySelector("#envelopes"),
  journeyMap: document.querySelector("#journeyMap"),
  letterDialog: document.querySelector("#letterDialog"),
  letterFaces: document.querySelectorAll(".letter-face"),
  letterSideImages: document.querySelectorAll(".letter-side-image"),
  photoDialog: document.querySelector("#photoDialog"),
  photoImage: document.querySelector("#photoImage"),
  letterTitle: document.querySelector("#letterTitle"),
  letterDate: document.querySelector("#letterDate"),
  letterNumber: document.querySelector("#letterNumber"),
  letterContent: document.querySelector("#letterContent"),
  letterPostcardButton: document.querySelector("#letterPostcardButton"),
  letterPostcard: document.querySelector("#letterPostcard"),
  finalDialog: document.querySelector("#finalDialog"),
  finalMessage: document.querySelector("#finalMessage"),
  screamer: document.querySelector("#screamer"),
  pathProgress: document.querySelector("#pathProgress"),
  confettiLayer: document.querySelector("#confettiLayer"),
  paper: document.querySelector(".letter-dialog__paper"),
  sky: document.querySelector("#sky"),
  toast: document.querySelector("#toast")
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
    const response = await fetch("data/cartas.json?v=5", { cache: "no-store" });
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
  elements.letterFaces.forEach((face) => { face.hidden = carta.id !== 1; });
  elements.letterSideImages.forEach((image) => { image.hidden = carta.id !== 3; });
  elements.letterPostcardButton.hidden = carta.id !== 2;

  if (carta.tipo === "votacion") renderVote(carta);
  else renderNormalLetter(carta);

  elements.letterDialog.showModal();
  if (carta.tipo === "screamer") {
    playScreamer();
  }
}

// Las cartas normales usan texto seguro; las cartas especiales construyen su interacción aparte.
function renderNormalLetter(carta) {
  const paragraph = document.createElement("p");
  paragraph.className = "typewriter";
  paragraph.textContent = carta.texto;
  elements.letterContent.append(paragraph);
  typewrite(paragraph, carta.texto);
  if (carta.imagen) {
    elements.letterContent.append(createLetterImage(carta.imagen, `Recuerdo: ${carta.titulo}`));
  }
}

function createLetterImage(src, alt) {
  const image = document.createElement("img");
  image.src = src;
  image.alt = alt;
  image.className = "letter-image";
  return image;
}

function typewrite(element, text) {
  element.textContent = "";
  let index = 0;
  const write = () => {
    if (!element.isConnected) return;
    element.textContent = text.slice(0, index);
    if (index < text.length) {
      index += 1;
      schedule(write, 22);
    }
  };
  write();
  element.addEventListener("pointerdown", () => {
    clearSequence();
    element.textContent = text;
  }, { once: true });
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
      result.textContent = option === "Gavi" ? "Veo que tendremos que hablar seriamente sobre este asunto 🧐 AJSJAS." : "Eyyyyy, muy biennnn, otra cosa más en la que hacemos match 🙃.";
      options.querySelectorAll("button").forEach((item) => { item.disabled = true; });
    });
    options.append(button);
  });
  elements.letterContent.append(intro, question, options, result);
}

function closeLetter() {
  if (!elements.letterDialog.open) return;
  clearSequence();
  closeScreamer();
  elements.paper.classList.remove("paper--dark");
  elements.letterDialog.close();
  if (activeLetterId && activeLetterId < totalCartas && !desbloqueadas.includes(activeLetterId + 1)) {
    desbloqueadas.push(activeLetterId + 1);
    saveProgress();
    renderEnvelopes();
    updateProgress();
  }
  if (activeLetterId === totalCartas) {
    elements.finalDialog.showModal();
    launchConfetti(120);
  }
  activeLetterId = null;
}

function playScreamer() {
  if (!elements.letterDialog.open) return;
  elements.screamer.classList.add("is-active");
  elements.screamer.setAttribute("aria-hidden", "false");
  playTone();
  if (navigator.vibrate) navigator.vibrate([200, 60, 200]);
  schedule(closeScreamer, 1400);
}

function closeScreamer() {
  const wasActive = elements.screamer.classList.contains("is-active");
  elements.screamer.classList.remove("is-active");
  elements.screamer.setAttribute("aria-hidden", "true");
  elements.paper.classList.remove("paper--dark");
  if (wasActive) showToast("Respira. Ya pasó. 😅");
}

// El sonido se genera con Web Audio para no depender de una librería o un archivo externo.
function getAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function playTone() {
  const context = getAudioContext();
  if (!context) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(320, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(50, context.currentTime + .6);
  gain.gain.setValueAtTime(.14, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .6);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + .6);
}

function schedule(callback, delay) {
  const timeout = window.setTimeout(() => {
    sequenceTimeouts = sequenceTimeouts.filter((item) => item !== timeout);
    callback();
  }, delay);
  sequenceTimeouts.push(timeout);
}

function clearSequence() {
  sequenceTimeouts.forEach((timeout) => window.clearTimeout(timeout));
  sequenceTimeouts = [];
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 3000);
}

function launchConfetti(amount = 45) {
  const colors = ["#e87968", "#a8432f", "#f7d58c", "#e8c27a", "#fff3d0"];
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

function initSky() {
  const canvas = elements.sky;
  const context = canvas.getContext("2d");
  const particles = [];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const resize = () => {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  };
  const create = () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    size: Math.random() * 1.8 + .5,
    speed: Math.random() * .18 + .05,
    phase: Math.random() * Math.PI * 2,
    gold: Math.random() > .42
  });
  resize();
  for (let index = 0; index < Math.min(70, Math.max(24, Math.floor(window.innerWidth / 12))); index += 1) particles.push(create());
  window.addEventListener("resize", resize);
  const draw = (time) => {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles.forEach((particle) => {
      if (!reduced) {
        particle.y -= particle.speed;
        particle.x += Math.sin(time * .0007 + particle.phase) * .12;
        if (particle.y < -10) { particle.y = window.innerHeight + 10; particle.x = Math.random() * window.innerWidth; }
      }
      const alpha = reduced ? .5 : .25 + (Math.sin(time * .003 + particle.phase) + 1) * .25;
      context.globalAlpha = alpha;
      context.fillStyle = particle.gold ? "#f7d58c" : "#ead9dc";
      context.shadowBlur = particle.gold ? 10 : 0;
      context.shadowColor = "#f7d58c";
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    });
    context.globalAlpha = 1;
    context.shadowBlur = 0;
    window.requestAnimationFrame(draw);
  };
  window.requestAnimationFrame(draw);
}

function setupHero() {
  const name = document.querySelector("#heroTitle span");
  name.innerHTML = [...name.textContent].map((letter, index) => `<i class="${letter === "y" ? "hero-title__y" : ""}" style="--letter-index:${index}">${letter === " " ? "&nbsp;" : letter}</i>`).join("");
  const empty = document.querySelector(".postcard--empty");
  const activate = () => showToast("Tenemos una salida pendiente 📸");
  empty.addEventListener("click", activate);
  empty.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(); } });
}

function saveMoment() {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 1080, 1440);
  gradient.addColorStop(0, "#3b173e");
  gradient.addColorStop(1, "#120b1a");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1080, 1440);
  context.fillStyle = "#fff8ed";
  context.fillRect(72, 90, 936, 1260);
  const image = new Image();
  image.onload = () => {
    const scale = Math.max(864 / image.width, 930 / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    context.save();
    context.beginPath();
    context.rect(108, 126, 864, 930);
    context.clip();
    context.drawImage(image, 108 + (864 - width) / 2, 126 + (930 - height) / 2, width, height);
    context.restore();
    context.fillStyle = "#3a2618";
    context.font = "700 74px Caveat, cursive";
    context.fillText("Kayra · feliz cumpleaños", 108, 1170);
    context.fillStyle = "#a8432f";
    context.font = "600 42px Caveat, cursive";
    context.fillText("Te quiero, hasta el infinito y mas allá ✨", 108, 1250);
    const link = document.createElement("a");
    link.download = "Recuerdo-Kayra.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("Guardado. Lo mejor viene después 💛");
  };
  image.src = "assets/foto-recuerdo.webp";
}

elements.paper.addEventListener("pointermove", (event) => {
  if (!elements.paper.classList.contains("paper--dark")) return;
  const bounds = elements.paper.getBoundingClientRect();
  elements.paper.style.setProperty("--x", `${event.clientX - bounds.left}px`);
  elements.paper.style.setProperty("--y", `${event.clientY - bounds.top}px`);
});
elements.paper.addEventListener("pointerdown", (event) => {
  const bounds = elements.paper.getBoundingClientRect();
  elements.paper.style.setProperty("--x", `${event.clientX - bounds.left}px`);
  elements.paper.style.setProperty("--y", `${event.clientY - bounds.top}px`);
});
document.querySelector("#startButton").addEventListener("click", () => document.querySelector("#sobres").scrollIntoView({ behavior: "smooth" }));
document.querySelector("#closeLetter").addEventListener("click", closeLetter);
function openPhoto(src, alt) {
  elements.photoImage.src = src;
  elements.photoImage.alt = alt;
  elements.photoImage.classList.toggle("photo-dialog__terror", src.includes("casita del terror"));
  elements.photoDialog.showModal();
}
document.querySelector("#photoButton").addEventListener("click", () => openPhoto("assets/foto-recuerdo.webp", "Kayra y yo juntos"));
document.querySelector("#letterPostcardButton").addEventListener("click", () => openPhoto("assets/casita del terror.jpg", "La casita del terror"));
document.querySelector("#closePhoto").addEventListener("click", () => elements.photoDialog.close());
elements.photoDialog.addEventListener("click", (event) => {
  if (event.target === elements.photoDialog) elements.photoDialog.close();
});
document.querySelector("#closeFinal").addEventListener("click", () => elements.finalDialog.close());
document.querySelector("#saveMoment").addEventListener("click", saveMoment);
elements.screamer.addEventListener("click", closeScreamer);
elements.screamer.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") closeScreamer();
});
elements.letterDialog.addEventListener("cancel", (event) => { event.preventDefault(); closeLetter(); });
elements.photoDialog.addEventListener("cancel", (event) => { event.preventDefault(); elements.photoDialog.close(); });
elements.finalDialog.addEventListener("cancel", (event) => { event.preventDefault(); elements.finalDialog.close(); });
window.addEventListener("load", () => { initSky(); setupHero(); launchConfetti(32); loadLetters(); });
