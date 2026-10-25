/* =========================================================
   ECO AVENTURA - trash.js
   -----------------------------------------------------------
   Representa um resíduo espalhado pelo mapa. Cada resíduo tem
   um "typeKey" que aponta para TRASH_TYPES (config.js), de onde
   vem seu nome, categoria e forma de desenho.

   Para adicionar um novo tipo de resíduo, edite TRASH_TYPES em
   config.js — não é necessário mexer neste arquivo.
   ========================================================= */

class TrashItem {
  constructor(x, y, typeKey){
    this.x = x;
    this.y = y;
    this.typeKey = typeKey;
    this.size = CONFIG.TRASH_SIZE;
    this.collected = false;
    this.bobPhase = Math.random() * Math.PI * 2; // dessincroniza a animação de flutuação
  }

  getBounds(){
    return { x: this.x, y: this.y, w: this.size, h: this.size };
  }

  getCenter(){
    return { x: this.x + this.size / 2, y: this.y + this.size / 2 };
  }

  update(dt){
    this.bobPhase += dt * 2;
  }

  draw(ctx, screenX, screenY){
    if (this.collected) return;
    const bob = Math.sin(this.bobPhase) * 3;

    // Sombra
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(screenX + this.size / 2, screenY + this.size - 2, this.size / 2.2, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    drawTrashIcon(ctx, this.typeKey, screenX + this.size / 2, screenY + this.size / 2 + bob, 1.35);
  }
}

/**
 * Desenha o ícone de um resíduo (usado tanto no chão quanto acima
 * da cabeça do jogador quando ele está carregando o item).
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} typeKey chave em TRASH_TYPES
 * @param {number} cx centro X na tela
 * @param {number} cy centro Y na tela
 * @param {number} scale fator de escala (1 = tamanho normal)
 */
function drawTrashIcon(ctx, typeKey, cx, cy, scale = 1){
  const t = TRASH_TYPES[typeKey];
  if (!t) return;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle = t.color;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1.5;

  switch (t.shape){
    case "bottle":
      // gargalo + corpo da garrafa
      ctx.beginPath();
      ctx.roundRect(-5, -14, 10, 8, 2);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(-9, -7, 18, 22, 4);
      ctx.fill(); ctx.stroke();
      break;

    case "can":
      // lata cilíndrica simplificada
      ctx.beginPath();
      ctx.roundRect(-8, -14, 16, 28, 3);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.moveTo(-8, -4); ctx.lineTo(8, -4);
      ctx.moveTo(-8, 4); ctx.lineTo(8, 4);
      ctx.stroke();
      break;

    case "paper":
      // folha de jornal dobrada
      ctx.beginPath();
      ctx.roundRect(-12, -10, 24, 20, 2);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      for (let i = -6; i <= 6; i += 6){
        ctx.beginPath();
        ctx.moveTo(-9, i); ctx.lineTo(9, i);
        ctx.stroke();
      }
      break;

    case "box":
      // caixa de papelão com "X" nas abas
      ctx.beginPath();
      ctx.rect(-13, -11, 26, 22);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.moveTo(-13, -11); ctx.lineTo(13, 11);
      ctx.moveTo(13, -11); ctx.lineTo(-13, 11);
      ctx.stroke();
      break;

    case "food":
      // resto de comida (casca/talo estilizado)
      ctx.beginPath();
      ctx.ellipse(0, 2, 13, 9, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#5c7a3d";
      ctx.beginPath();
      ctx.ellipse(6, -6, 4, 6, 0.6, 0, Math.PI * 2);
      ctx.fill();
      break;

    default:
      ctx.beginPath();
      ctx.rect(-10, -10, 20, 20);
      ctx.fill(); ctx.stroke();
  }

  ctx.restore();
}
