/* =========================================================
   ECO AVENTURA - main.js
   -----------------------------------------------------------
   Ponto de entrada do jogo. Configura o Canvas, os eventos de
   teclado, os botões das telas de menu e inicia o loop principal
   com requestAnimationFrame. Não depende de nenhum servidor —
   basta abrir index.html diretamente no navegador.
   ========================================================= */

(function(){
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");

  const ui = new UIManager();
  const audio = new AudioManager();
  const game = new Game(canvas, ctx, ui, audio);

  /* ---------------------------------------------------------
     TECLADO
     --------------------------------------------------------- */
  const keys = {};
  const MOVE_KEYS = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"];
  const INTERACT_KEYS = ["e", "enter", " "];

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    keys[key] = true;

    // Evita rolar a página com setas/espaço
    if (MOVE_KEYS.includes(key) || key === " ") e.preventDefault();

    if (key === "escape"){
      if (game.state === GameState.PLAYING || game.state === GameState.PAUSED){
        game.togglePause();
        audio.playClick();
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  function isInteractPressed(){
    return INTERACT_KEYS.some(k => keys[k]);
  }

  /* ---------------------------------------------------------
     BOTÕES DAS TELAS
     --------------------------------------------------------- */
  document.getElementById("btn-play").addEventListener("click", () => {
    audio.init();
    audio.playClick();
    game.startNewGame();
  });

  document.getElementById("btn-howto").addEventListener("click", () => {
    audio.init();
    audio.playClick();
    game.goToHowTo();
  });

  document.getElementById("btn-howto-back").addEventListener("click", () => {
    audio.playClick();
    game.goToStart();
  });

  document.getElementById("btn-resume").addEventListener("click", () => {
    audio.playClick();
    game.togglePause();
  });

  document.getElementById("btn-restart-phase").addEventListener("click", () => {
    audio.playClick();
    game.restartCurrentPhase();
    game.audio.startMusic();
  });

  document.getElementById("btn-back-menu").addEventListener("click", () => {
    audio.playClick();
    game.backToMenuFromPause();
  });

  document.getElementById("btn-next-phase").addEventListener("click", () => {
    audio.playClick();
    game.advanceAfterPhaseComplete();
    if (game.state === GameState.PLAYING) game.audio.startMusic();
  });

  document.getElementById("btn-play-again").addEventListener("click", () => {
    audio.playClick();
    game.startNewGame();
  });

  /* ---------------------------------------------------------
     TELA CHEIA
     --------------------------------------------------------- */
  document.getElementById("btn-fullscreen").addEventListener("click", () => {
    const container = document.getElementById("game-container");
    if (!document.fullscreenElement){
      if (container.requestFullscreen) container.requestFullscreen();
      else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  });

  /* ---------------------------------------------------------
     LOOP PRINCIPAL
     --------------------------------------------------------- */
  let lastTime = performance.now();

  function loop(now){
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    // Evita "saltos" grandes caso a aba fique em segundo plano
    dt = Math.min(dt, 0.05);

    game.update(dt, keys, isInteractPressed());
    game.render();

    requestAnimationFrame(loop);
  }

  requestAnimationFrame((t) => {
    lastTime = t;
    requestAnimationFrame(loop);
  });

  // Começa na tela inicial
  game.goToStart();
})();
