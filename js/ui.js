/* =========================================================
   ECO AVENTURA - ui.js
   -----------------------------------------------------------
   Duas responsabilidades:
   1) UIManager: controla as telas HTML sobrepostas (menu,
      como jogar, pausa, fase concluída, fim de jogo).
   2) Funções soltas draw*(): desenham o HUD e os elementos de
      feedback (prompts, mensagens, textos flutuantes, balões de
      diálogo) diretamente no Canvas durante a jogatina.
   ========================================================= */

class UIManager {
  constructor(){
    this.screens = {
      start: document.getElementById("screen-start"),
      howto: document.getElementById("screen-howto"),
      pause: document.getElementById("screen-pause"),
      phaseComplete: document.getElementById("screen-phase-complete"),
      gameComplete: document.getElementById("screen-game-complete"),
    };
  }

  /** Esconde todas as telas de overlay (usado ao voltar para o jogo). */
  hideAll(){
    Object.values(this.screens).forEach(el => el.classList.add("hidden"));
  }

  /** Mostra apenas a tela pedida (ou nenhuma, se name for null). */
  showScreen(name){
    this.hideAll();
    if (name && this.screens[name]) this.screens[name].classList.remove("hidden");
  }

  /** Preenche a tela de "fase concluída" com as estatísticas da fase. */
  setPhaseCompleteStats(stats, isFinalPhase){
    document.getElementById("phase-complete-title").textContent =
      isFinalPhase ? "ÚLTIMA FASE CONCLUÍDA!" : "FASE CONCLUÍDA!";
    document.getElementById("stat-score").textContent = stats.score;
    document.getElementById("stat-correct").textContent = stats.correct;
    document.getElementById("stat-wrong").textContent = stats.wrong;
    document.getElementById("stat-combo").textContent = "x" + stats.bestCombo;
    document.getElementById("stat-recycled").textContent = `${stats.recycled}/${stats.required}`;

    const btn = document.getElementById("btn-next-phase");
    btn.textContent = isFinalPhase ? "VER RESULTADO FINAL" : "PRÓXIMA FASE";
  }

  /** Preenche a tela final com as estatísticas acumuladas do jogo todo. */
  setGameCompleteStats(stats){
    document.getElementById("final-stat-score").textContent = stats.score;
    document.getElementById("final-stat-correct").textContent = stats.correct;
    document.getElementById("final-stat-wrong").textContent = stats.wrong;
    document.getElementById("final-stat-combo").textContent = "x" + stats.bestCombo;
  }
}

/* =========================================================
   HUD (canto superior esquerdo durante a jogatina)
   ========================================================= */
function drawHUD(ctx, state){
  ctx.save();

  // Painel de fundo semitransparente
  ctx.fillStyle = "rgba(10, 25, 15, 0.55)";
  ctx.fillRect(14, 14, 300, state.timeLimit != null ? 118 : 92);
  ctx.strokeStyle = "rgba(139, 212, 80, 0.6)";
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, 300, state.timeLimit != null ? 118 : 92);

  ctx.textAlign = "left";
  ctx.fillStyle = "#8bd450";
  ctx.font = "bold 16px Consolas, monospace";
  ctx.fillText("♻️ ECO AVENTURA", 26, 36);

  ctx.fillStyle = "#f4f1e2";
  ctx.font = "15px Consolas, monospace";
  ctx.fillText(`PONTOS: ${String(state.score).padStart(4, "0")}`, 26, 60);
  ctx.fillText(`COMBO: x${state.combo}`, 26, 80);
  ctx.fillText(`RESÍDUOS: ${state.recycled}/${state.required}`, 160, 80);

  if (state.timeLimit != null){
    const urgent = state.timeLeft <= 10;
    ctx.fillStyle = urgent ? "#e5533d" : "#f2b134";
    ctx.font = "bold 15px Consolas, monospace";
    ctx.fillText(`TEMPO: ${Math.max(0, Math.ceil(state.timeLeft))}`, 26, 102);
  }

  ctx.restore();

  // Item que o jogador está carregando (canto superior direito)
  if (state.carrying){
    const t = TRASH_TYPES[state.carrying];
    ctx.save();
    ctx.fillStyle = "rgba(10, 25, 15, 0.55)";
    ctx.fillRect(CONFIG.CANVAS_WIDTH - 260, 14, 246, 46);
    ctx.strokeStyle = "rgba(139, 212, 80, 0.6)";
    ctx.strokeRect(CONFIG.CANVAS_WIDTH - 260, 14, 246, 46);
    drawTrashIcon(ctx, state.carrying, CONFIG.CANVAS_WIDTH - 232, 37, 0.8);
    ctx.fillStyle = "#f4f1e2";
    ctx.font = "13px Consolas, monospace";
    ctx.textAlign = "left";
    ctx.fillText("Carregando:", CONFIG.CANVAS_WIDTH - 205, 30);
    ctx.font = "bold 13px Consolas, monospace";
    ctx.fillText(t.name, CONFIG.CANVAS_WIDTH - 205, 46);
    ctx.restore();
  }
}

/* =========================================================
   Prompt de interação ("PRESSIONE E PARA PEGAR/DESCARTAR")
   Desenhado em coordenadas de MUNDO (a função já recebe a
   posição já convertida para tela).
   ========================================================= */
function drawInteractionPrompt(ctx, screenX, screenY, text){
  ctx.save();
  ctx.font = "bold 12px Consolas, monospace";
  ctx.textAlign = "center";
  const paddingX = 10;
  const textWidth = ctx.measureText(text).width;
  const boxW = textWidth + paddingX * 2;

  ctx.fillStyle = "rgba(10, 25, 15, 0.85)";
  ctx.fillRect(screenX - boxW / 2, screenY - 30, boxW, 22);
  ctx.strokeStyle = "#f2b134";
  ctx.lineWidth = 2;
  ctx.strokeRect(screenX - boxW / 2, screenY - 30, boxW, 22);

  ctx.fillStyle = "#f2b134";
  ctx.fillText(text, screenX, screenY - 14);
  ctx.restore();
}

/* =========================================================
   Balão de diálogo de NPC (mundo)
   ========================================================= */
function drawDialogueBubble(ctx, npc, screenX, screenY){
  if (npc.bubbleOpacity <= 0.05) return;

  ctx.save();
  ctx.globalAlpha = npc.bubbleOpacity;

  ctx.font = "12px Consolas, monospace";
  const maxWidth = 260;
  const words = npc.currentLine.split(" ");
  const lines = [];
  let line = "";
  for (const w of words){
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth - 20){
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const lineHeight = 16;
  const boxH = lines.length * lineHeight + 16;
  const boxW = maxWidth;
  const boxX = screenX - boxW / 2;
  const boxY = screenY - boxH - 26;

  ctx.fillStyle = "rgba(20, 45, 32, 0.95)";
  ctx.strokeStyle = "#8bd450";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 6);
  ctx.fill();
  ctx.stroke();

  // Ponteiro do balão
  ctx.beginPath();
  ctx.moveTo(screenX - 8, boxY + boxH);
  ctx.lineTo(screenX + 8, boxY + boxH);
  ctx.lineTo(screenX, boxY + boxH + 10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f4f1e2";
  ctx.textAlign = "center";
  lines.forEach((l, i) => {
    ctx.fillText(l, screenX, boxY + 20 + i * lineHeight);
  });

  ctx.restore();
}

/* =========================================================
   Mensagem central temporária (acerto/erro)
   ========================================================= */
function drawToast(ctx, toast){
  if (!toast || toast.opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = toast.opacity;

  ctx.font = "bold 26px Consolas, monospace";
  ctx.textAlign = "center";
  const textWidth = ctx.measureText(toast.text).width;
  const boxW = textWidth + 50;
  const boxX = CONFIG.CANVAS_WIDTH / 2 - boxW / 2;
  const boxY = 130;

  ctx.fillStyle = "rgba(10, 20, 12, 0.85)";
  ctx.fillRect(boxX, boxY, boxW, 54);
  ctx.strokeStyle = toast.color;
  ctx.lineWidth = 3;
  ctx.strokeRect(boxX, boxY, boxW, 54);

  ctx.fillStyle = toast.color;
  ctx.fillText(toast.text, CONFIG.CANVAS_WIDTH / 2, boxY + 36);
  ctx.restore();
}

/** Dica educativa (aparece um pouco abaixo do toast de erro). */
function drawTip(ctx, tip){
  if (!tip || tip.opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = tip.opacity;
  ctx.font = "13px Consolas, monospace";
  ctx.textAlign = "center";

  const maxWidth = 620;
  const words = tip.text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words){
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth){
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);

  const boxY = 195;
  const boxH = lines.length * 18 + 16;
  ctx.fillStyle = "rgba(10, 20, 12, 0.8)";
  ctx.fillRect(CONFIG.CANVAS_WIDTH / 2 - maxWidth / 2 - 16, boxY, maxWidth + 32, boxH);

  ctx.fillStyle = "#f4f1e2";
  lines.forEach((l, i) => ctx.fillText(l, CONFIG.CANVAS_WIDTH / 2, boxY + 22 + i * 18));
  ctx.restore();
}

/* =========================================================
   Textos flutuantes ("+100" / "-50") em coordenadas de mundo
   ========================================================= */
function drawFloatingTexts(ctx, floatingTexts, camera){
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 20px Consolas, monospace";
  for (const f of floatingTexts){
    const progress = 1 - f.life / f.maxLife;
    const screenX = f.x - camera.x;
    const screenY = f.y - camera.y - progress * 40;
    ctx.globalAlpha = Utils.clamp(f.life / f.maxLife, 0, 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, screenX, screenY);
  }
  ctx.restore();
}
