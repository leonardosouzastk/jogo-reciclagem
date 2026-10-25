/* =========================================================
   ECO AVENTURA - game.js
   -----------------------------------------------------------
   Classe central que orquestra todo o jogo: máquina de estados
   (menu, jogando, pausado, fase concluída...), carregamento de
   fases, câmera, pontuação/combo, interações do jogador e o
   desenho de cada frame.
   ========================================================= */

const GameState = {
  START: "START",
  HOWTO: "HOWTO",
  PLAYING: "PLAYING",
  PAUSED: "PAUSED",
  PHASE_COMPLETE: "PHASE_COMPLETE",
  GAME_COMPLETE: "GAME_COMPLETE",
};

class Game {
  constructor(canvas, ctx, ui, audio){
    this.canvas = canvas;
    this.ctx = ctx;
    this.ui = ui;
    this.audio = audio;

    this.state = GameState.START;
    this.currentPhaseIndex = 0;

    this.player = null;
    this.map = null;
    this.camera = { x: 0, y: 0 };

    // Estatísticas cumulativas (o jogo todo)
    this.totalScore = 0;
    this.totalCorrect = 0;
    this.totalWrong = 0;
    this.bestComboOverall = 0;

    // Estatísticas da fase atual
    this.combo = 0;
    this.phaseCorrect = 0;
    this.phaseWrong = 0;
    this.phaseBestCombo = 0;
    this.recycledInPhase = 0;
    this.lives = CONFIG.MAX_LIVES;
    this.timeLeft = null;

    // Feedback visual
    this.floatingTexts = [];
    this.toast = null;
    this.tip = null;

    // Controle de "tecla de interação apertada uma vez" (edge trigger)
    this._interactWasDown = false;
    this.pendingAdvance = "next"; // 'next' | 'retry' — o que o botão da tela de resultado deve fazer
  }

  /* =========================================================
     CONTROLE DE ESTADOS / TELAS
     ========================================================= */

  goToStart(){
    this.state = GameState.START;
    this.audio.stopMusic();
    this.ui.showScreen("start");
  }

  goToHowTo(){
    this.state = GameState.HOWTO;
    this.ui.showScreen("howto");
  }

  startNewGame(){
    this.audio.init();
    this.totalScore = 0;
    this.totalCorrect = 0;
    this.totalWrong = 0;
    this.bestComboOverall = 0;
    this.currentPhaseIndex = 0;
    this.loadPhase(0);
    this.audio.startMusic();
  }

  loadPhase(index){
    const phaseConfig = PHASES[index];
    this.map = new GameMap(phaseConfig);
    this.player = new Player(this.map.playerStart.x, this.map.playerStart.y);

    this.combo = 0;
    this.phaseCorrect = 0;
    this.phaseWrong = 0;
    this.phaseBestCombo = 0;
    this.recycledInPhase = 0;
    this.lives = CONFIG.MAX_LIVES;
    this.timeLeft = phaseConfig.timeLimit;

    this.floatingTexts = [];
    this.toast = null;
    this.tip = null;

    // Evita que uma tecla de interação "presa" de antes da troca de fase
    // seja interpretada como um novo toque assim que a fase carregar.
    this._interactWasDown = false;

    // Câmera começa já centralizada no jogador (sem deslizar na entrada)
    this._updateCameraTarget(true);

    this.state = GameState.PLAYING;
    this.ui.showScreen(null);
  }

  restartCurrentPhase(){
    this.loadPhase(this.currentPhaseIndex);
  }

  togglePause(){
    if (this.state === GameState.PLAYING){
      this.state = GameState.PAUSED;
      this.ui.showScreen("pause");
    } else if (this.state === GameState.PAUSED){
      this.state = GameState.PLAYING;
      this.ui.showScreen(null);
    }
  }

  backToMenuFromPause(){
    this.goToStart();
  }

  /** Chamado pelo botão da tela de "fase concluída". */
  advanceAfterPhaseComplete(){
    if (this.pendingAdvance === "retry"){
      this.restartCurrentPhase();
      return;
    }
    const isFinal = this.currentPhaseIndex >= PHASES.length - 1;
    if (isFinal){
      this.showGameComplete();
    } else {
      this.currentPhaseIndex++;
      this.loadPhase(this.currentPhaseIndex);
    }
  }

  showGameComplete(){
    this.state = GameState.GAME_COMPLETE;
    this.audio.stopMusic();
    this.audio.playPhaseComplete();
    this.ui.setGameCompleteStats({
      score: this.totalScore,
      correct: this.totalCorrect,
      wrong: this.totalWrong,
      bestCombo: this.bestComboOverall,
    });
    this.ui.showScreen("gameComplete");
  }

  _completePhase(success, reason = null){
    this.state = GameState.PHASE_COMPLETE;
    this.audio.stopMusic();
    if (success) this.audio.playPhaseComplete();

    const phaseConfig = PHASES[this.currentPhaseIndex];
    const isFinal = this.currentPhaseIndex >= PHASES.length - 1;

    this.pendingAdvance = success ? "next" : "retry";

    this.ui.setPhaseCompleteStats(
      {
        score: this.totalScore,
        correct: this.phaseCorrect,
        wrong: this.phaseWrong,
        bestCombo: this.phaseBestCombo,
        recycled: this.recycledInPhase,
        required: phaseConfig.trashCount,
        lives: this.lives,
      },
      isFinal && success,
      success,
      reason
    );
    this.ui.showScreen("phaseComplete");
  }

  /* =========================================================
     LOOP PRINCIPAL
     ========================================================= */

  update(dt, keys, interactPressed){
    if (this.state !== GameState.PLAYING) return;

    this.player.update(dt, keys, this.map);
    this.map.update(dt, this.player);
    this._updateCameraTarget(false, dt);

    // Cronômetro (apenas na fase com limite de tempo)
    if (this.timeLeft != null){
      this.timeLeft -= dt;
      if (this.timeLeft <= 0){
        this.timeLeft = 0;
        this._completePhase(false, "O tempo acabou. Tente novamente!");
        return;
      }
    }

    // Interação (E / Enter / Espaço) — disparo único por toque (edge trigger)
    if (interactPressed && !this._interactWasDown){
      this._handleInteract();
    }
    this._interactWasDown = interactPressed;

    // Atualiza textos flutuantes
    this.floatingTexts = this.floatingTexts.filter(f => {
      f.life -= dt;
      f.y -= 22 * dt;
      return f.life > 0;
    });

    // Atualiza toast (mensagem central)
    if (this.toast){
      this.toast.elapsed += dt * 1000;
      const t = this.toast.elapsed;
      const d = this.toast.duration;
      if (t >= d){
        this.toast = null;
      } else if (t < 150){
        this.toast.opacity = t / 150;
      } else if (t > d - 300){
        this.toast.opacity = (d - t) / 300;
      } else {
        this.toast.opacity = 1;
      }
    }

    // Atualiza dica educativa
    if (this.tip){
      this.tip.elapsed += dt * 1000;
      const t = this.tip.elapsed;
      const d = this.tip.duration;
      if (t >= d){
        this.tip = null;
      } else if (t < 150){
        this.tip.opacity = t / 150;
      } else if (t > d - 400){
        this.tip.opacity = (d - t) / 400;
      } else {
        this.tip.opacity = 1;
      }
    }
  }

  _updateCameraTarget(snap, dt){
    const viewW = CONFIG.CANVAS_WIDTH;
    const viewH = CONFIG.CANVAS_HEIGHT;
    const pc = this.player.getCenter();

    const targetX = Utils.clamp(pc.x - viewW / 2, 0, Math.max(0, this.map.pixelWidth - viewW));
    const targetY = Utils.clamp(pc.y - viewH / 2, 0, Math.max(0, this.map.pixelHeight - viewH));

    if (snap){
      this.camera.x = targetX;
      this.camera.y = targetY;
    } else {
      const factor = Utils.clamp(CONFIG.CAMERA_SMOOTH * dt, 0, 1);
      this.camera.x = Utils.lerp(this.camera.x, targetX, factor);
      this.camera.y = Utils.lerp(this.camera.y, targetY, factor);
    }
  }

  /* =========================================================
     INTERAÇÃO: pegar resíduo / descartar na lixeira
     ========================================================= */

  _handleInteract(){
    const pc = this.player.getCenter();

    if (!this.player.carrying){
      // Procura o resíduo mais próximo dentro do raio de interação
      let nearest = null;
      let nearestDist = Infinity;
      for (const item of this.map.trashItems){
        if (item.collected) continue;
        const c = item.getCenter();
        const dist = Utils.distance(pc.x, pc.y, c.x, c.y);
        if (dist <= CONFIG.INTERACTION_RADIUS && dist < nearestDist){
          nearest = item;
          nearestDist = dist;
        }
      }
      if (nearest){
        nearest.collected = true;
        this.player.carrying = nearest.typeKey;
        this.player.carriedItem = nearest;
        this.audio.playPickup();
      }
      return;
    }

    // Jogador está carregando algo — procura lixeira próxima
    let nearestBin = null;
    let nearestDist = Infinity;
    for (const bin of this.map.bins){
      const c = bin.getCenter();
      const dist = Utils.distance(pc.x, pc.y, c.x, c.y);
      if (dist <= CONFIG.INTERACTION_RADIUS && dist < nearestDist){
        nearestBin = bin;
        nearestDist = dist;
      }
    }
    if (!nearestBin) return;

    const carriedKey = this.player.carrying;
    const trashInfo = TRASH_TYPES[carriedKey];
    const correct = trashInfo.category === nearestBin.categoryKey;
    const binCenter = nearestBin.getCenter();

    if (correct){
      this.combo++;
      this.phaseBestCombo = Math.max(this.phaseBestCombo, this.combo);
      this.bestComboOverall = Math.max(this.bestComboOverall, this.combo);

      const awarded = CONFIG.SCORE_CORRECT_BASE + (this.combo - 1) * CONFIG.SCORE_COMBO_STEP;
      this.totalScore += awarded;
      this.phaseCorrect++;
      this.totalCorrect++;
      this.recycledInPhase++;

      nearestBin.pulse();
      this.audio.playSuccess();
      this._spawnFloatingText(binCenter.x, binCenter.y - 20, `+${awarded}`, "#8bd450");
      this._showToast(`♻️ DESCARTE CORRETO! +${awarded}`, "#8bd450");
      this.tip = null;
    } else {
      this.combo = 0;
      this.lives--;
      this.totalScore = Math.max(CONFIG.SCORE_MIN, this.totalScore + CONFIG.SCORE_WRONG_PENALTY);
      this.phaseWrong++;
      this.totalWrong++;

      // O item nunca é perdido: ele volta ao ponto em que foi encontrado.
      // Assim, a fase sempre pode ser concluída enquanto ainda houver vidas.
      if (this.player.carriedItem){
        this.player.carriedItem.collected = false;
        this.player.carriedItem = null;
      }

      this.audio.playError();
      this._spawnFloatingText(binCenter.x, binCenter.y - 20, `${CONFIG.SCORE_WRONG_PENALTY}`, "#e5533d");
      this._showToast(`❌ DESCARTE INCORRETO! ${this.lives} VIDA${this.lives === 1 ? "" : "S"} RESTANTE${this.lives === 1 ? "" : "S"}`, "#e5533d");
      this._showTip(getWrongTip(carriedKey));
    }

    // O personagem sempre fica sem o item após tentar descartar
    this.player.carrying = null;
    this.player.carriedItem = null;

    if (this.lives <= 0){
      this._completePhase(false, "Você perdeu as 3 vidas. Tente novamente!");
      return;
    }

    if (this.recycledInPhase >= PHASES[this.currentPhaseIndex].trashCount){
      this._completePhase(true);
    }
  }

  _spawnFloatingText(x, y, text, color){
    this.floatingTexts.push({ x, y, text, color, life: CONFIG.FLOATING_TEXT_DURATION / 1000, maxLife: CONFIG.FLOATING_TEXT_DURATION / 1000 });
  }

  _showToast(text, color){
    this.toast = { text, color, elapsed: 0, duration: CONFIG.MESSAGE_DURATION, opacity: 0 };
  }

  _showTip(text){
    this.tip = { text, elapsed: 0, duration: CONFIG.TIP_DURATION, opacity: 0 };
  }

  /* =========================================================
     RENDERIZAÇÃO
     ========================================================= */

  render(){
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    if (this.state === GameState.START || this.state === GameState.HOWTO){
      return; // as telas HTML cobrem o canvas
    }

    if (!this.map || !this.player) return;

    const camera = this.camera;
    this.map.drawBackground(ctx, camera);
    const project = (x, y) => this.map.isometric
      ? this.map.toScreen(x, y)
      : { x: x - camera.x, y: y - camera.y };

    // Resíduos no chão (sempre abaixo dos demais elementos)
    for (const item of this.map.trashItems){
      if (item.collected) continue;
      const center = project(item.x + item.size / 2, item.y + item.size / 2);
      const sx = center.x - item.size / 2;
      const sy = center.y - item.size / 2;
      if (sx < -50 || sx > CONFIG.CANVAS_WIDTH + 50 || sy < -50 || sy > CONFIG.CANVAS_HEIGHT + 50) continue;
      item.draw(ctx, sx, sy);
    }

    // Monta lista de elementos com profundidade (para desenhar na ordem certa)
    const depthList = [];

    for (const obs of this.map.obstacles){
      if (this.map.isometric && obs.type === "wall") continue;
      const center = project(obs.x + obs.w / 2, obs.y + obs.h / 2);
      depthList.push({ bottom: obs.y + obs.h, draw: () => drawObstacle(ctx, obs, center.x - obs.w / 2, center.y - obs.h / 2) });
    }
    for (const bin of this.map.bins){
      const center = project(bin.x + bin.w / 2, bin.y + bin.h / 2);
      depthList.push({ bottom: bin.y + bin.h, draw: () => bin.draw(ctx, center.x - bin.w / 2, center.y - bin.h / 2) });
    }
    for (const npc of this.map.npcs){
      const center = project(npc.x + npc.size / 2, npc.y + npc.size / 2);
      depthList.push({ bottom: npc.y + npc.size, draw: () => npc.draw(ctx, center.x - npc.size / 2, center.y - npc.size / 2) });
    }
    const playerCenter = project(this.player.x + this.player.size / 2, this.player.y + this.player.size / 2);
    depthList.push({ bottom: this.player.y + this.player.size, draw: () => this.player.draw(ctx, playerCenter.x - this.player.size / 2, playerCenter.y - this.player.size / 2) });

    depthList.sort((a, b) => a.bottom - b.bottom);
    depthList.forEach(entry => entry.draw());

    // Balões de diálogo dos NPCs (sempre por cima do cenário)
    for (const npc of this.map.npcs){
      const center = project(npc.x + npc.size / 2, npc.y + npc.size / 2);
      const sx = center.x;
      const sy = center.y - npc.size / 2;
      drawDialogueBubble(ctx, npc, sx, sy);
    }

    // Prompt de interação (pegar ou descartar)
    this._renderInteractionPrompt(ctx, camera);

    // HUD
    drawHUD(ctx, {
      score: this.totalScore,
      combo: this.combo,
      phaseName: PHASES[this.currentPhaseIndex].name,
      lives: this.lives,
      recycled: this.recycledInPhase,
      required: PHASES[this.currentPhaseIndex].trashCount,
      timeLimit: PHASES[this.currentPhaseIndex].timeLimit,
      timeLeft: this.timeLeft,
      carrying: this.player.carrying,
    });

    // Feedback (textos flutuantes, toast, dica)
    drawFloatingTexts(ctx, this.floatingTexts, camera, this.map);
    drawToast(ctx, this.toast);
    drawTip(ctx, this.tip);
  }

  _renderInteractionPrompt(ctx, camera){
    const pc = this.player.getCenter();
    const project = (x, y) => this.map.isometric
      ? this.map.toScreen(x, y)
      : { x: x - camera.x, y: y - camera.y };

    if (!this.player.carrying){
      for (const item of this.map.trashItems){
        if (item.collected) continue;
        const c = item.getCenter();
        if (Utils.distance(pc.x, pc.y, c.x, c.y) <= CONFIG.INTERACTION_RADIUS){
          const point = project(c.x, c.y);
          drawInteractionPrompt(ctx, point.x, point.y, "PRESSIONE E PARA PEGAR");
          break;
        }
      }
    } else {
      for (const bin of this.map.bins){
        const c = bin.getCenter();
        if (Utils.distance(pc.x, pc.y, c.x, c.y) <= CONFIG.INTERACTION_RADIUS){
          // Posicionado acima do rótulo da lixeira para não sobrepor o texto da categoria
          const point = project(c.x, bin.y);
          drawInteractionPrompt(ctx, point.x, point.y - 18, "PRESSIONE E PARA DESCARTAR");
          break;
        }
      }
    }
  }
}
