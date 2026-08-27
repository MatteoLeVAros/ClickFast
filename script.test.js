describe("Jeu ClickFast", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();

    document.body.innerHTML = `
      <div id="score">0</div>
      <div id="timer">5</div>
      <button id="button-clicker">Clique ici !</button>
      <p id="api-message"></p>
      <ol id="ranking"></ol>
    `;

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    window.prompt = jest.fn().mockReturnValue("Testeur");

    require("./script.js");
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test("le score augmente après un clic", () => {
    const button = document.getElementById("button-clicker");
    const score = document.getElementById("score");

    button.click();

    expect(score.textContent).toBe("1");
  });

  test("le score augmente correctement après plusieurs clics", () => {
    const button = document.getElementById("button-clicker");
    const score = document.getElementById("score");

    button.click();
    button.click();
    button.click();

    expect(score.textContent).toBe("3");
  });

  test("le chronomètre atteint zéro après cinq secondes", () => {
    const button = document.getElementById("button-clicker");
    const timer = document.getElementById("timer");

    button.click();

    jest.advanceTimersByTime(5000);

    expect(timer.textContent).toBe("0");
  });

  test("le score ne change plus après la fin du chronomètre", () => {
    const button = document.getElementById("button-clicker");
    const score = document.getElementById("score");

    button.click();
    button.click();

    expect(score.textContent).toBe("2");

    jest.advanceTimersByTime(5000);

    button.click();

    expect(score.textContent).toBe("2");
    expect(button.disabled).toBe(true);
  });
});