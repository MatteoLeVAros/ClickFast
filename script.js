// Une fois que le HTML ressemble à ce que vous voulez : 
// 1. Faire une variable count, qui stockera le nombre de clics
// 2. Faire un eventListener sur le bouton

const API_URL = "http://localhost:3000";

const button = document.getElementById("button-clicker");
const scoreElement = document.getElementById("score");
const timerElement = document.getElementById("timer");
const rankingElement = document.getElementById("ranking");
const apiMessageElement = document.getElementById("api-message");

let count = 0;
let timeLeft = 5;
let gameStarted = false;
let gameFinished = false;

async function loadRanking() {
  try {
    const response = await fetch(`${API_URL}/scores`);

    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }

    const scores = await response.json();

    rankingElement.replaceChildren();

    for (const entry of scores) {
      const item = document.createElement("li");
      item.textContent = `${entry.username} : ${entry.score}`;
      rankingElement.appendChild(item);
    }

    apiMessageElement.textContent = "";
  } catch (error) {
    console.error("Classement indisponible :", error);

    apiMessageElement.textContent =
      "Le classement est temporairement indisponible.";
  }
}

async function saveScore(username, score) {
  try {
    const response = await fetch(`${API_URL}/scores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        score,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }

    apiMessageElement.textContent = "Score enregistré.";

    await loadRanking();
  } catch (error) {
    console.error("Enregistrement impossible :", error);

    apiMessageElement.textContent =
      "Impossible d'enregistrer le score. Le jeu reste disponible.";
  }
}

async function finishGame() {
  gameFinished = true;
  button.disabled = true;
  button.textContent = "Partie terminée";

  const enteredName = window.prompt(
    "Partie terminée ! Entre ton nom :",
    "Matteo"
  );

  const username = enteredName?.trim();

  if (!username) {
    apiMessageElement.textContent =
      "Score non enregistré : aucun nom fourni.";
    return;
  }

  await saveScore(username, count);
}

button.addEventListener("click", () => {
  if (gameFinished) {
    return;
  }

  count++;
  scoreElement.textContent = count;

  if (!gameStarted) {
    gameStarted = true;

    const timer = window.setInterval(() => {
      timeLeft--;
      timerElement.textContent = timeLeft;

      if (timeLeft <= 0) {
        window.clearInterval(timer);
        finishGame();
      }
    }, 1000);
  }
});

loadRanking();
const variableJamaisUtilisee = true;