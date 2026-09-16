/* =========================================================
   ECO AVENTURA - player.js
   -----------------------------------------------------------
   Controla o personagem do jogador: movimento livre em 4/8
   direções, animação simples de caminhada, colisão com objetos
   e com os limites do mapa.

   O desenho é feito inteiramente com formas geométricas no
   Canvas (placeholder). Para trocar por sprites PNG no futuro,
   basta editar o método draw() — veja o README.md.
   ========================================================= */

class Player {
  constructor(x, y){
    this.x = x;
    this.y = y;
    this.size = CONFIG.PLAYER_SIZE;
    this.speed = CONFIG.PLAYER_SPEED; // ajustável em config.js

    this.direction = "down"; // 'up' | 'down' | 'left' | 'right'
    this.moving = false;

    this.animTimer = 0;
    this.animFrame = 0; // 0..3 (usado para alternar as "pernas")

    this.carrying = null; // chave do TRASH_TYPES sendo carregado, ou null
  }

  /** Retângulo de colisão (AABB). */
  getBounds(){
    return { x: this.x, y: this.y, w: this.size, h: this.size };
  }

  /** Centro do jogador (usado para cálculos de distância/proximidade). */
  getCenter(){
    return { x: this.x + this.size / 2, y: this.y + this.size / 2 };
  }

  /**
   * Atualiza posição, direção e animação.
   * @param {number} dt segundos desde o último frame
   * @param {object} keys mapa de teclas pressionadas (main.js)
   * @param {GameMap} map mapa atual, usado para colisão e limites
   */
  update(dt, keys, map){
    let dx = 0;
    let dy = 0;

    if (keys["arrowup"] || keys["w"]) dy -= 1;
    if (keys["arrowdown"] || keys["s"]) dy += 1;
    if (keys["arrowleft"] || keys["a"]) dx -= 1;
    if (keys["arrowright"] || keys["d"]) dx += 1;

    this.moving = dx !== 0 || dy !== 0;

    if (this.moving){
      // Normaliza para não andar mais rápido na diagonal
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;

      // Define a direção "visual" priorizando o eixo dominante
      if (Math.abs(dx) > Math.abs(dy)){
        this.direction = dx > 0 ? "right" : "left";
      } else {
        this.direction = dy > 0 ? "down" : "up";
      }

      const moveX = dx * this.speed * dt;
      const moveY = dy * this.speed * dt;

      this._moveAxis(moveX, 0, map);
      this._moveAxis(0, moveY, map);

      // Avança a animação de caminhada
      this.animTimer += dt;
      if (this.animTimer >= CONFIG.PLAYER_ANIM_FRAME_TIME){
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 4;
      }
    } else {
      this.animFrame = 0;
      this.animTimer = 0;
    }
  }

  /** Move em apenas um eixo por vez, testando colisão — evita "grudar" nos cantos. */
  _moveAxis(moveX, moveY, map){
    const next = { x: this.x + moveX, y: this.y + moveY, w: this.size, h: this.size };

    // Limites do mapa
    next.x = Utils.clamp(next.x, 0, map.pixelWidth - this.size);
    next.y = Utils.clamp(next.y, 0, map.pixelHeight - this.size);

    // Colisão com obstáculos
    for (const obs of map.obstacles){
      if (Utils.rectsIntersect(next, obs)){
        return; // colidiu — não aplica o movimento neste eixo
      }
    }

    this.x = next.x;
    this.y = next.y;
  }

  /** Desenha o personagem (placeholder em formas geométricas, estilo top-down). */
  draw(ctx, screenX, screenY){
    const s = this.size;
    const bob = this.moving ? Math.sin(this.animFrame * (Math.PI / 2)) * 3 : 0;

    ctx.save();
    ctx.translate(screenX, screenY);

    // Sombra
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(s / 2, s - 4, s / 2.4, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pernas (alternam levemente para simular passos)
    const legOffset = this.moving ? Math.sin(this.animFrame * (Math.PI / 2)) * 4 : 0;
    ctx.fillStyle = "#33475b";
    ctx.fillRect(s * 0.28, s * 0.62 + legOffset * 0.3, s * 0.16, s * 0.3);
    ctx.fillRect(s * 0.56, s * 0.62 - legOffset * 0.3, s * 0.16, s * 0.3);

    // Corpo (camiseta verde - "ajudante da reciclagem")
    ctx.fillStyle = "#3fae5c";
    ctx.fillRect(s * 0.18, s * 0.32 - bob * 0.2, s * 0.64, s * 0.42);

    // Cabeça
    ctx.fillStyle = "#f0c39a";
    ctx.beginPath();
    ctx.arc(s / 2, s * 0.26 - bob * 0.2, s * 0.24, 0, Math.PI * 2);
    ctx.fill();

    // Cabelo
    ctx.fillStyle = "#5b3a20";
    ctx.beginPath();
    ctx.arc(s / 2, s * 0.18 - bob * 0.2, s * 0.24, Math.PI, 0);
    ctx.fill();

    // Rosto direcional (olhos indicam para onde o personagem está olhando)
    ctx.fillStyle = "#222";
    const eyeY = s * 0.26 - bob * 0.2;
    if (this.direction === "down"){
      ctx.fillRect(s * 0.42, eyeY, 3, 3);
      ctx.fillRect(s * 0.55, eyeY, 3, 3);
    } else if (this.direction === "up"){
      // de costas: sem rosto visível, só cabelo (já desenhado)
    } else if (this.direction === "left"){
      ctx.fillRect(s * 0.36, eyeY, 3, 3);
    } else if (this.direction === "right"){
      ctx.fillRect(s * 0.6, eyeY, 3, 3);
    }

    // Braços (viram indicador de "carregando" objeto)
    ctx.fillStyle = "#f0c39a";
    ctx.fillRect(s * 0.08, s * 0.38 - bob * 0.2, s * 0.12, s * 0.24);
    ctx.fillRect(s * 0.8, s * 0.38 - bob * 0.2, s * 0.12, s * 0.24);

    ctx.restore();

    // Item sendo carregado, exibido acima da cabeça
    if (this.carrying){
      drawTrashIcon(ctx, this.carrying, screenX + s / 2, screenY - 14, 0.55);
    }
  }
}
