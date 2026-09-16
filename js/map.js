/* =========================================================
   ECO AVENTURA - map.js
   -----------------------------------------------------------
   Gera o mapa de cada fase: grama, caminhos, árvores nas bordas
   (que também funcionam como limite do mapa), obstáculos
   variados (árvores, pedras, bancos, casas), a "estação de
   coleta seletiva" com as 5 lixeiras, os resíduos espalhados e
   os NPCs.

   O layout é gerado de forma semi-aleatória a partir dos
   parâmetros de cada fase (veja PHASES em config.js), evitando
   sobreposições entre objetos.
   ========================================================= */

class GameMap {
  constructor(phaseConfig){
    this.tileSize = CONFIG.TILE_SIZE;
    this.widthTiles = phaseConfig.mapWidthTiles;
    this.heightTiles = phaseConfig.mapHeightTiles;
    this.pixelWidth = this.widthTiles * this.tileSize;
    this.pixelHeight = this.heightTiles * this.tileSize;

    this.obstacles = [];   // {x,y,w,h,type} - possuem colisão
    this.paths = [];       // {x,y,w,h} - apenas visual
    this.grassDetails = []; // pequenos detalhes decorativos na grama
    this.bins = [];
    this.trashItems = [];
    this.npcs = [];
    this.playerStart = { x: 0, y: 0 };

    this._generate(phaseConfig);
  }

  _generate(phaseConfig){
    const ts = this.tileSize;
    const avoidZones = [];

    // ---- 1) Árvores na borda (também servem como limite visual do mapa) ----
    for (let tx = 0; tx < this.widthTiles; tx++){
      this._addTree(tx * ts + ts / 2, ts / 2);
      this._addTree(tx * ts + ts / 2, (this.heightTiles - 1) * ts + ts / 2);
    }
    for (let ty = 1; ty < this.heightTiles - 1; ty++){
      this._addTree(ts / 2, ty * ts + ts / 2);
      this._addTree((this.widthTiles - 1) * ts + ts / 2, ty * ts + ts / 2);
    }

    // ---- 2) Ponto de partida do jogador (canto superior esquerdo, livre) ----
    this.playerStart = { x: ts * 2.5, y: ts * 2.5 };
    avoidZones.push({ x: ts * 1.2, y: ts * 1.2, w: ts * 3, h: ts * 3 });

    // ---- 3) Estação de coleta seletiva (5 lixeiras lado a lado) ----
    const binGap = 96;
    const stationWidth = binGap * 5;
    const stationX = this.pixelWidth / 2 - stationWidth / 2;
    const stationY = this.pixelHeight - ts * 2.6;
    const binOrder = ["PAPEL", "PLASTICO", "VIDRO", "METAL", "ORGANICO"];

    binOrder.forEach((cat, i) => {
      const bin = new Bin(stationX + i * binGap + 12, stationY, cat);
      this.bins.push(bin);
    });
    avoidZones.push({ x: stationX - 40, y: stationY - 50, w: stationWidth + 80, h: 180 });

    // Caminho visual até a estação (apenas decorativo)
    this.paths.push({ x: stationX - 20, y: stationY - 10, w: stationWidth + 40, h: 110 });
    this.paths.push({ x: this.pixelWidth / 2 - ts, y: ts * 3, w: ts * 2, h: this.pixelHeight - ts * 5 });

    // ---- 4) NPCs educativos (posições fixas e seguras) ----
    const npc1 = new NPC(ts * 4, ts * 4, NPC_DIALOGUES.guia, "#e08b3f");
    const npc2 = new NPC(this.pixelWidth - ts * 6, ts * 3, NPC_DIALOGUES.dicas, "#4a7fc9");
    this.npcs.push(npc1, npc2);
    avoidZones.push({ x: npc1.x - 50, y: npc1.y - 50, w: 140, h: 140 });
    avoidZones.push({ x: npc2.x - 50, y: npc2.y - 50, w: 140, h: 140 });

    // ---- 5) Obstáculos internos (árvores, pedras, bancos, casas) ----
    const density = phaseConfig.obstacleDensity;
    const composition = [
      { type: "tree", weight: 0.45 },
      { type: "rock", weight: 0.3 },
      { type: "bench", weight: 0.15 },
      { type: "house", weight: 0.1 },
    ];

    for (let i = 0; i < density; i++){
      const roll = Math.random();
      let acc = 0;
      let chosen = composition[0].type;
      for (const c of composition){
        acc += c.weight;
        if (roll <= acc){ chosen = c.type; break; }
      }
      this._placeObstacleRandomly(chosen, avoidZones);
    }

    // ---- 6) Detalhes decorativos na grama (puramente visuais) ----
    const detailCount = Math.floor((this.widthTiles * this.heightTiles) / 6);
    for (let i = 0; i < detailCount; i++){
      this.grassDetails.push({
        x: Utils.randomInt(ts, this.pixelWidth - ts),
        y: Utils.randomInt(ts, this.pixelHeight - ts),
        size: Utils.randomInt(3, 7),
        shade: Utils.randomChoice(["#3f8a49", "#5aa85f", "#347a3f"]),
      });
    }

    // ---- 7) Resíduos espalhados pelo mapa ----
    for (let i = 0; i < phaseConfig.trashCount; i++){
      const typeKey = Utils.randomChoice(phaseConfig.trashPool);
      const pos = this._findFreeSpot(30, avoidZones);
      this.trashItems.push(new TrashItem(pos.x, pos.y, typeKey));
    }
  }

  _addTree(cx, cy){
    this.obstacles.push({ x: cx - 16, y: cy - 16, w: 32, h: 32, type: "tree" });
  }

  /** Tenta posicionar um obstáculo em um local livre, evitando zonas reservadas. */
  _placeObstacleRandomly(type, avoidZones){
    const sizes = {
      tree:  { w: 32, h: 32 },
      rock:  { w: 36, h: 26 },
      bench: { w: 66, h: 24 },
      house: { w: 120, h: 96 },
    };
    const size = sizes[type];
    const pos = this._findFreeSpot(Math.max(size.w, size.h), avoidZones);
    this.obstacles.push({ x: pos.x - size.w / 2, y: pos.y - size.h / 2, w: size.w, h: size.h, type });
  }

  /** Procura uma posição livre (sem colidir com obstáculos/zonas reservadas). */
  _findFreeSpot(objSize, avoidZones){
    const ts = this.tileSize;
    const margin = ts * 1.5;
    let attempts = 0;

    while (attempts < 80){
      attempts++;
      const x = Utils.randomInt(margin, this.pixelWidth - margin);
      const y = Utils.randomInt(margin, this.pixelHeight - margin);
      const testRect = { x: x - objSize / 2, y: y - objSize / 2, w: objSize, h: objSize };

      let blocked = false;

      for (const obs of this.obstacles){
        if (Utils.rectsIntersect(Utils.inflateRect(testRect, 12), obs)){ blocked = true; break; }
      }
      if (!blocked){
        for (const zone of avoidZones){
          if (Utils.rectsIntersect(testRect, zone)){ blocked = true; break; }
        }
      }
      if (!blocked){
        for (const item of this.trashItems){
          if (Utils.distance(x, y, item.x, item.y) < 60){ blocked = true; break; }
        }
      }

      if (!blocked) return { x, y };
    }
    // fallback: devolve qualquer posição dentro dos limites (raramente necessário)
    return { x: this.pixelWidth / 2, y: this.pixelHeight / 2 };
  }

  update(dt, player){
    this.trashItems.forEach(t => t.update(dt));
    this.bins.forEach(b => b.update(dt));
    this.npcs.forEach(n => n.update(dt, player));
  }

  /** Desenha o fundo estático: grama, textura e caminhos. Chamado antes de tudo o mais. */
  drawBackground(ctx, camera){
    const viewLeft = camera.x;
    const viewTop = camera.y;
    const viewRight = camera.x + CONFIG.CANVAS_WIDTH;
    const viewBottom = camera.y + CONFIG.CANVAS_HEIGHT;

    // Base de grama
    ctx.fillStyle = "#4c8f52";
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Detalhes de grama (apenas os visíveis, por performance)
    for (const d of this.grassDetails){
      if (d.x < viewLeft - 10 || d.x > viewRight + 10 || d.y < viewTop - 10 || d.y > viewBottom + 10) continue;
      ctx.fillStyle = d.shade;
      ctx.fillRect(d.x - camera.x, d.y - camera.y, d.size, d.size);
    }

    // Caminhos (visual apenas)
    ctx.fillStyle = "#d8c48a";
    for (const p of this.paths){
      if (p.x > viewRight || p.x + p.w < viewLeft || p.y > viewBottom || p.y + p.h < viewTop) continue;
      ctx.fillRect(p.x - camera.x, p.y - camera.y, p.w, p.h);
    }
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 3;
    for (const p of this.paths){
      if (p.x > viewRight || p.x + p.w < viewLeft || p.y > viewBottom || p.y + p.h < viewTop) continue;
      ctx.strokeRect(p.x - camera.x, p.y - camera.y, p.w, p.h);
    }
  }
}

/* =========================================================
   Funções de desenho dos obstáculos (placeholders em Canvas)
   ========================================================= */
function drawObstacle(ctx, obs, screenX, screenY){
  switch (obs.type){
    case "tree": drawTree(ctx, obs, screenX, screenY); break;
    case "rock": drawRock(ctx, obs, screenX, screenY); break;
    case "bench": drawBench(ctx, obs, screenX, screenY); break;
    case "house": drawHouse(ctx, obs, screenX, screenY); break;
  }
}

function drawTree(ctx, obs, sx, sy){
  const cx = sx + obs.w / 2;
  const baseY = sy + obs.h;

  // Sombra
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(cx, baseY, obs.w * 0.6, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tronco
  ctx.fillStyle = "#6b4226";
  ctx.fillRect(cx - 6, sy + obs.h - 18, 12, 20);

  // Copa (três círculos sobrepostos para dar volume)
  ctx.fillStyle = "#2f7d3c";
  ctx.beginPath(); ctx.arc(cx, sy - 6, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3c9349";
  ctx.beginPath(); ctx.arc(cx - 14, sy + 4, 16, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 14, sy + 4, 16, 0, Math.PI * 2); ctx.fill();
}

function drawRock(ctx, obs, sx, sy){
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(sx + obs.w / 2, sy + obs.h + 3, obs.w / 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#9099a1";
  ctx.beginPath();
  ctx.ellipse(sx + obs.w / 2, sy + obs.h / 2, obs.w / 2, obs.h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#aab2b8";
  ctx.beginPath();
  ctx.ellipse(sx + obs.w * 0.4, sy + obs.h * 0.4, obs.w * 0.22, obs.h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBench(ctx, obs, sx, sy){
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(sx, sy + obs.h - 2, obs.w, 6);

  ctx.fillStyle = "#8a5a34";
  ctx.fillRect(sx, sy + 4, obs.w, 8);       // encosto
  ctx.fillRect(sx, sy + obs.h - 10, obs.w, 8); // assento
  ctx.fillStyle = "#5c3a20";
  ctx.fillRect(sx + 4, sy + obs.h - 2, 6, 10);
  ctx.fillRect(sx + obs.w - 10, sy + obs.h - 2, 6, 10);
}

function drawHouse(ctx, obs, sx, sy){
  const w = obs.w, h = obs.h;

  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(sx + w / 2, sy + h + 4, w / 2, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Parede
  ctx.fillStyle = "#e3c9a3";
  ctx.fillRect(sx, sy + h * 0.35, w, h * 0.65);

  // Telhado
  ctx.fillStyle = "#a8452f";
  ctx.beginPath();
  ctx.moveTo(sx - 8, sy + h * 0.38);
  ctx.lineTo(sx + w / 2, sy - h * 0.08);
  ctx.lineTo(sx + w + 8, sy + h * 0.38);
  ctx.closePath();
  ctx.fill();

  // Porta
  ctx.fillStyle = "#6b4226";
  ctx.fillRect(sx + w / 2 - 12, sy + h - 34, 24, 34);

  // Janelas
  ctx.fillStyle = "#bfe4f2";
  ctx.strokeStyle = "#5c4224";
  ctx.lineWidth = 2;
  ctx.fillRect(sx + w * 0.18, sy + h * 0.5, 22, 22);
  ctx.strokeRect(sx + w * 0.18, sy + h * 0.5, 22, 22);
  ctx.fillRect(sx + w * 0.72, sy + h * 0.5, 22, 22);
  ctx.strokeRect(sx + w * 0.72, sy + h * 0.5, 22, 22);
}
