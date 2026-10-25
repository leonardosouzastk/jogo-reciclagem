/* =========================================================
   ECO AVENTURA - bins.js
   -----------------------------------------------------------
   Representa uma lixeira de coleta seletiva. Existem cinco
   categorias (veja CATEGORIES em config.js): PAPEL, PLASTICO,
   VIDRO, METAL e ORGANICO. Cada uma tem cor e nome distintos.

   Para adicionar uma nova lixeira/categoria, edite CATEGORIES em
   config.js e ajuste o array TRASH_TYPES para referenciá-la.
   ========================================================= */

class Bin {
  constructor(x, y, categoryKey){
    this.x = x;
    this.y = y;
    this.categoryKey = categoryKey;
    this.w = 70;
    this.h = 80;
    this.highlight = 0; // usado para o efeito de "brilho" ao acertar
  }

  getBounds(){
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  getCenter(){
    return { x: this.x + this.w / 2, y: this.y + this.h / 2 };
  }

  update(dt){
    if (this.highlight > 0) this.highlight = Math.max(0, this.highlight - dt * 2);
  }

  /** Dispara um breve brilho, usado no descarte correto. */
  pulse(){
    this.highlight = 1;
  }

  draw(ctx, screenX, screenY){
    const cat = CATEGORIES[this.categoryKey];
    const w = this.w, h = this.h;

    ctx.save();
    ctx.translate(screenX, screenY);

    // Sombra
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(w / 2, h + 2, w / 2.2, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Brilho de destaque (acerto recente)
    if (this.highlight > 0){
      ctx.save();
      ctx.globalAlpha = this.highlight * 0.5;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, w * 0.9, h * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Corpo de lixeira com rodas, tampa e pega: mais próximo de uma lixeira real.
    const bodyGradient = ctx.createLinearGradient(0, 14, 0, h);
    bodyGradient.addColorStop(0, shadeColor(cat.color, 18));
    bodyGradient.addColorStop(1, shadeColor(cat.color, -10));
    ctx.fillStyle = bodyGradient;
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(7, 18); ctx.lineTo(w - 7, 18); ctx.lineTo(w - 11, h - 8); ctx.lineTo(11, h - 8); ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Reflexo discreto para dar volume sem perder a leitura da cor.
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(14, 26, 5, h - 42);

    // Tampa
    ctx.fillStyle = shadeColor(cat.color, -20);
    ctx.beginPath();
    ctx.roundRect(0, 5, w, 15, 4);
    ctx.fill();
    ctx.stroke();

    // Alça, pedal e rodas.
    ctx.fillStyle = shadeColor(cat.color, -35);
    ctx.fillRect(w * 0.3, 1, w * 0.4, 5);
    ctx.fillRect(w * 0.39, h - 8, w * 0.22, 4);
    ctx.fillStyle = "#2b3540";
    ctx.beginPath(); ctx.arc(16, h - 6, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w - 16, h - 6, 6, 0, Math.PI * 2); ctx.fill();

    // Símbolo de reciclagem
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("♻", w / 2, h / 2 + 14);

    ctx.restore();

    // Nome da categoria, sempre visível acima da lixeira
    ctx.save();
    ctx.font = "bold 13px Consolas, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#0c1a10";
    ctx.fillText(cat.label, screenX + w / 2 + 1, screenY - 9);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(cat.label, screenX + w / 2, screenY - 10);
    ctx.restore();
  }
}

/** Escurece (valor negativo) ou clareia (valor positivo) uma cor hex. */
function shadeColor(hex, percent){
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + Math.round(2.55 * percent);
  let g = ((num >> 8) & 0x00ff) + Math.round(2.55 * percent);
  let b = (num & 0x0000ff) + Math.round(2.55 * percent);
  r = Utils.clamp(r, 0, 255);
  g = Utils.clamp(g, 0, 255);
  b = Utils.clamp(b, 0, 255);
  return `rgb(${r},${g},${b})`;
}
