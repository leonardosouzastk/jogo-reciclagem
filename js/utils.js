/* =========================================================
   ECO AVENTURA - utils.js
   Funções utilitárias genéricas usadas pelo resto do jogo.
   ========================================================= */

/* Polyfill de CanvasRenderingContext2D.roundRect para navegadores mais
   antigos que não implementam o método nativo (mantém o jogo 100%
   funcional em qualquer navegador que já rode Canvas 2D). */
(function ensureRoundRect(){
  if (typeof CanvasRenderingContext2D === "undefined") return;
  if (CanvasRenderingContext2D.prototype.roundRect) return;
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r){
    if (typeof r === "number") r = { tl: r, tr: r, br: r, bl: r };
    this.beginPath();
    this.moveTo(x + r.tl, y);
    this.lineTo(x + w - r.tr, y);
    this.arcTo(x + w, y, x + w, y + r.tr, r.tr);
    this.lineTo(x + w, y + h - r.br);
    this.arcTo(x + w, y + h, x + w - r.br, y + h, r.br);
    this.lineTo(x + r.bl, y + h);
    this.arcTo(x, y + h, x, y + h - r.bl, r.bl);
    this.lineTo(x, y + r.tl);
    this.arcTo(x, y, x + r.tl, y, r.tl);
    this.closePath();
    return this;
  };
})();

const Utils = {

  /** Restringe um valor entre um mínimo e um máximo. */
  clamp(value, min, max){
    return Math.max(min, Math.min(max, value));
  },

  /** Distância euclidiana entre dois pontos. */
  distance(x1, y1, x2, y2){
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /** Inteiro aleatório entre min e max (inclusive). */
  randomInt(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /** Elemento aleatório de um array. */
  randomChoice(array){
    return array[Math.floor(Math.random() * array.length)];
  },

  /** Interseção entre dois retângulos AABB {x,y,w,h}. */
  rectsIntersect(a, b){
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  },

  /** Verifica se um ponto está dentro de um retângulo. */
  pointInRect(px, py, rect){
    return px >= rect.x && px <= rect.x + rect.w &&
           py >= rect.y && py <= rect.y + rect.h;
  },

  /** Interpolação linear. */
  lerp(a, b, t){
    return a + (b - a) * t;
  },

  /** Retorna um retângulo "inflado" em todas as direções (usado para raio de interação). */
  inflateRect(rect, amount){
    return {
      x: rect.x - amount,
      y: rect.y - amount,
      w: rect.w + amount * 2,
      h: rect.h + amount * 2,
    };
  },
};
