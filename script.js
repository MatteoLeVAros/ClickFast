// Une fois que le HTML ressemble à ce que vous voulez : 
// 1. Faire une variable count, qui stockera le nombre de clics
// 2. Faire un eventListener sur le bouton

const button = document.getElementById("button-clicker");
const scoreElement = document.getElementById("score");
const timerElement = document.getElementById("timer");

let count = 0;
let timeLeft = 5;
let gameStarted = false;
let gameFinished = false;

button.addEventListener("click", function () {
  if (gameFinished) {
    return;
  }

  if (!gameStarted) {
    gameStarted = true;

    const timer = setInterval(function () {
      timeLeft--;
      timerElement.textContent = timeLeft;

      if (timeLeft <= 0) {
        clearInterval(timer);
        gameFinished = true;
        button.disabled = true;
        button.textContent = "Partie terminée";
      }
    }, 1000);
  }

  count++;
  scoreElement.textContent = count;
});