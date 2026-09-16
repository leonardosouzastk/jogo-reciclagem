/* =========================================================
   ECO AVENTURA - npc.js
   -----------------------------------------------------------
   NPCs são personagens parados no mapa que exibem uma frase
   educativa (balão de fala) quando o jogador se aproxima.
   Não bloqueiam o jogador (sem colisão) para manter a
   experiência simples e fluida.
   ========================================================= */

class NPC {
  /**
   * @param {number} x posição X no mapa (pixels)
   * @param {number} y posição Y no mapa (pixels)
   * @param {string[]} lines frases que o NPC pode dizer
   * @param {string} colorShirt cor da roupa, para distinguir NPCs visualmente
   */
  constructor(x, y, lines, colorShirt = "#e08b3f"){
    this.x = x;
    this.y = y;
    this.size = CONFIG.PLAYER_SIZE;
    this.lines = lines;
    this.currentLine = Utils.randomChoice(lines);
    this.colorShirt = colorShirt;
    this.talkRadius = CONFIG.NPC_TALK_RADIUS;
    this.bubbleOpacity = 0; // controla o fade in/out do balão
  }

  getCenter(){
    return { x: this.x + this.size / 2, y: this.y + this.size / 2 };
  }

  /** Atualiza o fade do balão de fala conforme a proximidade do jogador. */
  update(dt, player){
    const c = this.getCenter();
    const pc = player.getCenter();
    const dist = Utils.distance(c.x, c.y, pc.x, pc.y);
    const near = dist <= this.talkRadius;

    const fadeSpeed = dt / CONFIG.DIALOGUE_FADE;
    if (near){
      this.bubbleOpacity = Math.min(1, this.bubbleOpacity + fadeSpeed);
    } else {
      this.bubbleOpacity = Math.max(0, this.bubbleOpacity - fadeSpeed);
    }
  }

  draw(ctx, screenX, screenY){
    const s = this.size;

    ctx.save();
    ctx.translate(screenX, screenY);

    // Sombra
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(s / 2, s - 4, s / 2.4, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Corpo
    ctx.fillStyle = this.colorShirt;
    ctx.fillRect(s * 0.18, s * 0.32, s * 0.64, s * 0.42);

    // Cabeça
    ctx.fillStyle = "#e8b489";
    ctx.beginPath();
    ctx.arc(s / 2, s * 0.26, s * 0.24, 0, Math.PI * 2);
    ctx.fill();

    // Cabelo
    ctx.fillStyle = "#2b2b2b";
    ctx.beginPath();
    ctx.arc(s / 2, s * 0.18, s * 0.24, Math.PI, 0);
    ctx.fill();

    // Olhos (sempre de frente — o NPC "observa" quem se aproxima)
    ctx.fillStyle = "#222";
    ctx.fillRect(s * 0.42, s * 0.26, 3, 3);
    ctx.fillRect(s * 0.55, s * 0.26, 3, 3);

    // Braços
    ctx.fillStyle = "#e8b489";
    ctx.fillRect(s * 0.08, s * 0.38, s * 0.12, s * 0.24);
    ctx.fillRect(s * 0.8, s * 0.38, s * 0.12, s * 0.24);

    ctx.restore();

    // Ícone de "conversa disponível" flutuando (folha verde)
    if (this.bubbleOpacity > 0.05){
      ctx.save();
      ctx.globalAlpha = this.bubbleOpacity;
      ctx.font = "20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("💬", screenX + s / 2, screenY - 12);
      ctx.restore();
    }
  }
}
