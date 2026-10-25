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
    this.theme = phaseConfig.theme;
    this.isometric = false;
    this.widthTiles = phaseConfig.mapWidthTiles;
    this.heightTiles = phaseConfig.mapHeightTiles;
    this.pixelWidth = this.widthTiles * this.tileSize;
    this.pixelHeight = this.heightTiles * this.tileSize;

    this.obstacles = [];   // {x,y,w,h,type} - possuem colisão
    this.paths = [];       // {x,y,w,h} - apenas visual
    this.grassDetails = []; // pequenos detalhes decorativos na grama
    this.decorations = [];  // decoração sem colisão: janelas, quadros, placas etc.
    this.bins = [];
    this.trashItems = [];
    this.npcs = [];
    this.playerStart = { x: 0, y: 0 };

    this._generate(phaseConfig);
  }

  _generate(phaseConfig){
    const ts = this.tileSize;
    const avoidZones = [];

    // ---- 1) Limites do cenário (também servem como colisão) ----
    for (let tx = 0; tx < this.widthTiles; tx++){
      this._addBorderObject(tx * ts + ts / 2, ts / 2);
      this._addBorderObject(tx * ts + ts / 2, (this.heightTiles - 1) * ts + ts / 2);
    }
    for (let ty = 1; ty < this.heightTiles - 1; ty++){
      this._addBorderObject(ts / 2, ty * ts + ts / 2);
      this._addBorderObject((this.widthTiles - 1) * ts + ts / 2, ty * ts + ts / 2);
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

    // Área de coleta e caminho de acesso (apenas visual)
    this.paths.push({ x: stationX - 24, y: stationY - 18, w: stationWidth + 48, h: 128, type: "station" });
    this.paths.push({ x: this.pixelWidth / 2 - ts, y: ts * 3, w: ts * 2, h: this.pixelHeight - ts * 5, type: "path" });

    // ---- 4) NPCs educativos (posições fixas e seguras) ----
    const npc1 = new NPC(ts * 4, ts * 4, NPC_DIALOGUES.guia, "#e08b3f");
    const npcPositions = {
      quarto: { x: ts * 14.8, y: ts * 4.2 },
      escola: { x: ts * 17.0, y: ts * 8.1 },
      rua: { x: ts * 15.8, y: ts * 9.0 },
    };
    const npc2Pos = npcPositions[this.theme] || { x: this.pixelWidth - ts * 6, y: ts * 3 };
    const npc2 = new NPC(npc2Pos.x, npc2Pos.y, NPC_DIALOGUES.dicas, "#4a7fc9");
    this.npcs.push(npc1, npc2);
    avoidZones.push({ x: npc1.x - 50, y: npc1.y - 50, w: 140, h: 140 });
    avoidZones.push({ x: npc2.x - 50, y: npc2.y - 50, w: 140, h: 140 });

    // ---- 5) Layouts 2D feitos à mão, cheios de objetos e identidade própria ----
    this._addScenarioLayout(avoidZones);

    // Obstáculos extras, caso uma fase futura escolha usar densidade aleatória.
    const density = phaseConfig.obstacleDensity;
    const compositions = {
      quarto: [
        { type: "bed", weight: 0.34 }, { type: "desk", weight: 0.3 },
        { type: "plant", weight: 0.2 }, { type: "bookcase", weight: 0.16 },
      ],
      escola: [
        { type: "desk", weight: 0.42 }, { type: "bookcase", weight: 0.24 },
        { type: "bench", weight: 0.2 }, { type: "plant", weight: 0.14 },
      ],
      rua: [
        { type: "tree", weight: 0.45 }, { type: "rock", weight: 0.25 },
        { type: "bench", weight: 0.18 }, { type: "house", weight: 0.12 },
      ],
    };
    const composition = compositions[this.theme] || compositions.rua;

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

    // ---- 6) Pequenos detalhes decorativos (puramente visuais) ----
    const detailCount = Math.floor((this.widthTiles * this.heightTiles) / 6);
    const detailColors = this.theme === "rua"
      ? ["#3f8a49", "#5aa85f", "#347a3f"]
      : this.theme === "escola"
        ? ["#c7b78d", "#e4d7b2", "#b3cbd0"]
        : ["#b98d63", "#d9b189", "#a97951"];
    for (let i = 0; i < detailCount; i++){
      this.grassDetails.push({
        x: Utils.randomInt(ts, this.pixelWidth - ts),
        y: Utils.randomInt(ts, this.pixelHeight - ts),
        size: Utils.randomInt(3, 7),
        shade: Utils.randomChoice(detailColors),
      });
    }

    // ---- 7) Resíduos espalhados pelo mapa ----
    for (let i = 0; i < phaseConfig.trashCount; i++){
      const typeKey = Utils.randomChoice(phaseConfig.trashPool);
      const pos = this._findFreeSpot(CONFIG.TRASH_SIZE + 12, avoidZones);
      this.trashItems.push(new TrashItem(pos.x, pos.y, typeKey));
    }
  }

  _addBorderObject(cx, cy){
    if (this.theme === "rua"){
      this.obstacles.push({ x: cx - 16, y: cy - 16, w: 32, h: 32, type: "tree" });
    } else {
      this.obstacles.push({ x: cx - 32, y: cy - 32, w: 64, h: 64, type: "wall" });
    }
  }

  _addScenarioLayout(avoidZones){
    const ts = this.tileSize;
    const add = (type, x, y) => {
      const sizes = {
        bed: { w: 112, h: 82 }, desk: { w: 72, h: 54 }, plant: { w: 38, h: 42 },
        bookcase: { w: 58, h: 76 }, bench: { w: 66, h: 24 }, house: { w: 120, h: 96 },
        tree: { w: 42, h: 46 }, rock: { w: 36, h: 26 }, dresser: { w: 78, h: 56 },
        chair: { w: 34, h: 36 }, lampPost: { w: 28, h: 70 }, busStop: { w: 96, h: 72 },
      };
      const size = sizes[type];
      this.obstacles.push({ x, y, w: size.w, h: size.h, type });
      avoidZones.push({ x: x - 14, y: y - 14, w: size.w + 28, h: size.h + 28 });
    };
    const decorate = (type, x, y, w = 48, h = 40) => this.decorations.push({ type, x, y, w, h });

    if (this.theme === "quarto"){
      this.paths.push({ x: ts * 5.1, y: ts * 6.2, w: ts * 8.5, h: ts * 3.2, type: "rug" });
      add("bed", ts * 2.1, ts * 6.3);
      add("desk", ts * 7.2, ts * 2.5);
      add("chair", ts * 8.0, ts * 3.7);
      add("dresser", ts * 11.0, ts * 2.7);
      add("bookcase", ts * 18.3, ts * 2.6);
      add("plant", ts * 17.6, ts * 7.1);
      add("chair", ts * 14.3, ts * 7.0);
      decorate("window", ts * 3.0, ts * 1.05, 86, 38);
      decorate("window", ts * 15.0, ts * 1.05, 86, 38);
      decorate("poster", ts * 10.1, ts * 1.15, 44, 54);
      decorate("lamp", ts * 15.0, ts * 6.8, 32, 58);
      decorate("clothes", ts * 4.7, ts * 3.2, 64, 44);
    } else if (this.theme === "escola"){
      this.paths.push({ x: ts * 2, y: ts * 2.1, w: ts * 19.5, h: ts * 8.5, type: "classroom" });
      add("bookcase", ts * 2.1, ts * 3.2);
      add("desk", ts * 7.0, ts * 4.1);
      add("desk", ts * 10.2, ts * 4.1);
      add("desk", ts * 13.4, ts * 4.1);
      add("desk", ts * 7.0, ts * 6.9);
      add("desk", ts * 10.2, ts * 6.9);
      add("desk", ts * 13.4, ts * 6.9);
      add("bookcase", ts * 19.7, ts * 3.2);
      add("bench", ts * 16.3, ts * 4.2);
      add("bench", ts * 16.3, ts * 6.6);
      add("plant", ts * 18.0, ts * 7.0);
      decorate("chalkboard", ts * 9.2, ts * 1.12, 170, 54);
      decorate("clock", ts * 16.3, ts * 1.1, 36, 36);
      decorate("poster", ts * 4.6, ts * 1.1, 42, 54);
      decorate("schoolPoster", ts * 18.4, ts * 1.1, 42, 54);
    } else {
      this.paths.push({ x: ts * 1.2, y: ts * 5.3, w: this.pixelWidth - ts * 2.4, h: ts * 3.1, type: "street" });
      add("house", ts * 2.0, ts * 2.0);
      add("house", ts * 19.0, ts * 2.0);
      add("tree", ts * 7.2, ts * 2.5);
      add("tree", ts * 8.5, ts * 3.4);
      add("tree", ts * 14.8, ts * 2.5);
      add("tree", ts * 16.1, ts * 3.4);
      add("bench", ts * 3.0, ts * 9.2);
      add("bench", ts * 18.2, ts * 9.2);
      add("lampPost", ts * 5.8, ts * 4.1);
      add("lampPost", ts * 17.1, ts * 4.1);
      add("busStop", ts * 10.2, ts * 2.1);
      add("plant", ts * 12.0, ts * 3.1);
      decorate("crosswalk", ts * 11.1, ts * 5.55, 104, 140);
      decorate("streetSign", ts * 4.8, ts * 2.4, 42, 60);
      decorate("cloud", ts * 5.0, ts * 1.1, 86, 30);
      decorate("cloud", ts * 15.4, ts * 1.5, 72, 28);
    }
  }

  /** Tenta posicionar um obstáculo em um local livre, evitando zonas reservadas. */
  _placeObstacleRandomly(type, avoidZones){
    const sizes = {
      tree:  { w: 32, h: 32 },
      rock:  { w: 36, h: 26 },
      bench: { w: 66, h: 24 },
      house: { w: 120, h: 96 },
      bed: { w: 112, h: 82 },
      desk: { w: 72, h: 54 },
      plant: { w: 38, h: 42 },
      bookcase: { w: 58, h: 76 },
      dresser: { w: 78, h: 56 },
      chair: { w: 34, h: 36 },
      lampPost: { w: 28, h: 70 },
      busStop: { w: 96, h: 72 },
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
          if (Utils.distance(x, y, item.x, item.y) < CONFIG.TRASH_SIZE + 32){ blocked = true; break; }
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

  /** Converte posições lógicas do jogo para a projeção isométrica 3/4. */
  toScreen(x, y){
    return {
      x: CONFIG.CANVAS_WIDTH / 2 + (x - y) * 0.5,
      y: 145 + (x + y) * 0.24,
    };
  }

  _drawIsoArea(ctx, area, color, stroke = null){
    const a = this.toScreen(area.x, area.y);
    const b = this.toScreen(area.x + area.w, area.y);
    const c = this.toScreen(area.x + area.w, area.y + area.h);
    const d = this.toScreen(area.x, area.y + area.h);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    if (stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }

  _drawIsometricBackground(ctx){
    const palette = {
      quarto: { floor: "#b59f50", line: "#846f36", wall: "#b9b8a4", wallSide: "#999987" },
      escola: { floor: "#b7c0b4", line: "#8e9a91", wall: "#d0d2c1", wallSide: "#afb6aa" },
      rua: { floor: "#6fa65b", line: "#4e8249", wall: null, wallSide: null },
    }[this.theme] || {};

    ctx.fillStyle = "#050608";
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Duas paredes altas, inspiradas em jogos de aventura dos anos 90.
    if (palette.wall){
      ctx.fillStyle = palette.wallSide;
      ctx.beginPath();
      ctx.moveTo(640, 8); ctx.lineTo(38, 308); ctx.lineTo(38, 430); ctx.lineTo(640, 145); ctx.closePath(); ctx.fill();
      ctx.fillStyle = palette.wall;
      ctx.beginPath();
      ctx.moveTo(640, 8); ctx.lineTo(1242, 308); ctx.lineTo(1242, 430); ctx.lineTo(640, 145); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#f4f2de"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(640, 8); ctx.lineTo(38, 308); ctx.lineTo(38, 430); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(640, 8); ctx.lineTo(1242, 308); ctx.lineTo(1242, 430); ctx.stroke();
    }

    this._drawIsoArea(ctx, { x: 0, y: 0, w: this.pixelWidth, h: this.pixelHeight }, palette.floor, "#e5d87b");

    // Grade do piso: tábuas/azulejos em perspectiva.
    ctx.strokeStyle = palette.line;
    ctx.lineWidth = 2;
    for (let x = 0; x <= this.pixelWidth; x += this.tileSize){
      const a = this.toScreen(x, 0); const b = this.toScreen(x, this.pixelHeight);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (let y = 0; y <= this.pixelHeight; y += this.tileSize){
      const a = this.toScreen(0, y); const b = this.toScreen(this.pixelWidth, y);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    const colors = { station: "#d9d4b5", rug: "#5485bb", classroom: "#dbe1c9", street: "#5e6670", path: "#d7c787" };
    for (const path of this.paths) this._drawIsoArea(ctx, path, colors[path.type] || colors.path, "rgba(20,30,30,0.28)");
  }

  /** Desenha o fundo estático: grama, textura e caminhos. Chamado antes de tudo o mais. */
  drawBackground(ctx, camera){
    if (this.isometric){
      this._drawIsometricBackground(ctx);
      return;
    }
    const viewLeft = camera.x;
    const viewTop = camera.y;
    const viewRight = camera.x + CONFIG.CANVAS_WIDTH;
    const viewBottom = camera.y + CONFIG.CANVAS_HEIGHT;

    const palettes = {
      quarto: { floor: "#c99556", detail: "rgba(96, 57, 27, 0.38)", path: "#efd1a2" },
      escola: { floor: "#d7e0d5", detail: "rgba(93, 121, 113, 0.22)", path: "#b8d0d8" },
      rua: { floor: "#6faf64", detail: "rgba(35, 94, 44, 0.24)", path: "#d8c48a" },
    };
    const palette = palettes[this.theme] || palettes.rua;

    // Piso em pixel art: tábuas no quarto, azulejos na escola e grama na rua.
    ctx.fillStyle = palette.floor;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    ctx.strokeStyle = palette.detail;
    ctx.lineWidth = this.theme === "quarto" ? 3 : 1;
    const firstX = -(camera.x % this.tileSize);
    const firstY = -(camera.y % this.tileSize);
    if (this.theme === "quarto"){
      for (let y = firstY; y < CONFIG.CANVAS_HEIGHT; y += this.tileSize / 2){
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CONFIG.CANVAS_WIDTH, y); ctx.stroke();
      }
      for (let x = firstX; x < CONFIG.CANVAS_WIDTH; x += this.tileSize * 2){
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CONFIG.CANVAS_HEIGHT); ctx.stroke();
      }
    } else if (this.theme === "escola"){
      for (let x = firstX; x < CONFIG.CANVAS_WIDTH; x += this.tileSize){
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CONFIG.CANVAS_HEIGHT); ctx.stroke();
      }
      for (let y = firstY; y < CONFIG.CANVAS_HEIGHT; y += this.tileSize){
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CONFIG.CANVAS_WIDTH, y); ctx.stroke();
      }
    }

    // Detalhes de grama (apenas os visíveis, por performance)
    for (const d of this.grassDetails){
      if (d.x < viewLeft - 10 || d.x > viewRight + 10 || d.y < viewTop - 10 || d.y > viewBottom + 10) continue;
      ctx.fillStyle = d.shade;
      ctx.fillRect(d.x - camera.x, d.y - camera.y, d.size, d.size);
    }

    // Tapetes, pátio e rua são desenhados como áreas distintas de cada cenário.
    for (const p of this.paths){
      if (p.x > viewRight || p.x + p.w < viewLeft || p.y > viewBottom || p.y + p.h < viewTop) continue;
      const sx = p.x - camera.x;
      const sy = p.y - camera.y;
      const colors = { station: "#e9dfbd", rug: "#5d91c4", classroom: "#f4efd9", street: "#5c6470", path: palette.path };
      ctx.fillStyle = colors[p.type] || palette.path;
      ctx.fillRect(sx, sy, p.w, p.h);
      if (p.type === "rug"){
        ctx.strokeStyle = "#b9e4ef"; ctx.lineWidth = 4; ctx.strokeRect(sx + 8, sy + 8, p.w - 16, p.h - 16);
      } else if (p.type === "street"){
        ctx.fillStyle = "#f4e56a";
        for (let x = sx + 24; x < sx + p.w; x += 84) ctx.fillRect(x, sy + p.h / 2 - 4, 42, 8);
      }
    }
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 3;
    for (const p of this.paths){
      if (p.x > viewRight || p.x + p.w < viewLeft || p.y > viewBottom || p.y + p.h < viewTop) continue;
      ctx.strokeRect(p.x - camera.x, p.y - camera.y, p.w, p.h);
    }

    for (const d of this.decorations){
      if (d.x > viewRight || d.x + d.w < viewLeft || d.y > viewBottom || d.y + d.h < viewTop) continue;
      drawDecoration(ctx, d, d.x - camera.x, d.y - camera.y);
    }

    // Sombras nas paredes dão a sensação de um cômodo em perspectiva 3/4.
    if (this.theme !== "rua"){
      ctx.fillStyle = this.theme === "quarto" ? "#f4e7ca" : "#eaf3ec";
      ctx.fillRect(-camera.x, -camera.y, this.pixelWidth, this.tileSize);
      ctx.fillStyle = "rgba(31, 48, 53, 0.18)";
      ctx.fillRect(-camera.x, this.tileSize - camera.y, this.pixelWidth, 12);
    }
  }
}

/* =========================================================
   Funções de desenho dos obstáculos (placeholders em Canvas)
   ========================================================= */
function drawObstacle(ctx, obs, screenX, screenY){
  switch (obs.type){
    case "wall": drawWall(ctx, obs, screenX, screenY); break;
    case "tree": drawTree(ctx, obs, screenX, screenY); break;
    case "rock": drawRock(ctx, obs, screenX, screenY); break;
    case "bench": drawBench(ctx, obs, screenX, screenY); break;
    case "house": drawHouse(ctx, obs, screenX, screenY); break;
    case "bed": drawBed(ctx, obs, screenX, screenY); break;
    case "desk": drawDesk(ctx, obs, screenX, screenY); break;
    case "plant": drawPlant(ctx, obs, screenX, screenY); break;
    case "bookcase": drawBookcase(ctx, obs, screenX, screenY); break;
    case "dresser": drawDresser(ctx, obs, screenX, screenY); break;
    case "chair": drawChair(ctx, obs, screenX, screenY); break;
    case "lampPost": drawLampPost(ctx, obs, screenX, screenY); break;
    case "busStop": drawBusStop(ctx, obs, screenX, screenY); break;
  }
}

function drawDecoration(ctx, d, sx, sy){
  ctx.save();
  if (d.type === "window"){
    ctx.fillStyle = "#604d42"; ctx.fillRect(sx, sy, d.w, d.h);
    ctx.fillStyle = "#7cc6df"; ctx.fillRect(sx + 5, sy + 5, d.w - 10, d.h - 10);
    ctx.strokeStyle = "#e9e6d2"; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(sx + d.w / 2, sy + 5); ctx.lineTo(sx + d.w / 2, sy + d.h - 5); ctx.moveTo(sx + 5, sy + d.h / 2); ctx.lineTo(sx + d.w - 5, sy + d.h / 2); ctx.stroke();
  } else if (d.type === "chalkboard"){
    ctx.fillStyle = "#8b6239"; ctx.fillRect(sx, sy, d.w, d.h); ctx.fillStyle = "#315447"; ctx.fillRect(sx + 6, sy + 6, d.w - 12, d.h - 12);
    ctx.fillStyle = "#e5e1bd"; ctx.font = "bold 16px monospace"; ctx.fillText("RECICLE!", sx + 14, sy + 33);
  } else if (d.type === "clock"){
    ctx.fillStyle = "#755846"; ctx.beginPath(); ctx.arc(sx + d.w / 2, sy + d.h / 2, d.w / 2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#f5f0d2"; ctx.beginPath(); ctx.arc(sx + d.w / 2, sy + d.h / 2, d.w / 2 - 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#424b5a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx + d.w / 2, sy + d.h / 2); ctx.lineTo(sx + d.w / 2, sy + 10); ctx.moveTo(sx + d.w / 2, sy + d.h / 2); ctx.lineTo(sx + d.w - 10, sy + d.h / 2); ctx.stroke();
  } else if (d.type === "poster" || d.type === "schoolPoster"){
    ctx.fillStyle = "#4c5f77"; ctx.fillRect(sx, sy, d.w, d.h); ctx.fillStyle = d.type === "poster" ? "#edb850" : "#77b8d5"; ctx.fillRect(sx + 4, sy + 4, d.w - 8, d.h - 8); ctx.fillStyle = "#ffffff"; ctx.font = "bold 13px monospace"; ctx.fillText("♻", sx + d.w / 2 - 7, sy + d.h / 2 + 5);
  } else if (d.type === "lamp"){
    ctx.fillStyle = "#51483e"; ctx.fillRect(sx + 14, sy + 18, 5, d.h - 18); ctx.fillStyle = "#f2c85e"; ctx.fillRect(sx + 6, sy, 22, 20);
  } else if (d.type === "clothes"){
    ctx.strokeStyle = "#5e4939"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, sy + 8); ctx.lineTo(sx + d.w, sy + 8); ctx.stroke(); ["#d95c5c", "#5787c2", "#e9c959"].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(sx + 7 + i * 18, sy + 10, 13, d.h - 13); });
  } else if (d.type === "crosswalk"){
    ctx.fillStyle = "rgba(255,255,255,.86)"; for (let y = sy; y < sy + d.h; y += 24) ctx.fillRect(sx, y, d.w, 12);
  } else if (d.type === "streetSign"){
    ctx.fillStyle = "#47515e"; ctx.fillRect(sx + 18, sy + 24, 6, d.h - 24); ctx.fillStyle = "#3a82b4"; ctx.fillRect(sx, sy, d.w, 28); ctx.fillStyle = "#fff"; ctx.font = "bold 10px monospace"; ctx.fillText("RUA", sx + 8, sy + 18);
  } else if (d.type === "cloud"){
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.arc(sx + 20, sy + 17, 14, 0, Math.PI * 2); ctx.arc(sx + 39, sy + 12, 17, 0, Math.PI * 2); ctx.arc(sx + 58, sy + 18, 12, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawWall(ctx, obs, sx, sy){
  ctx.fillStyle = "#6c7c89";
  ctx.fillRect(sx, sy, obs.w, obs.h);
  ctx.fillStyle = "#91a1ab";
  ctx.fillRect(sx + 4, sy + 4, obs.w - 8, 10);
  ctx.strokeStyle = "rgba(20,35,42,0.45)";
  ctx.lineWidth = 2;
  ctx.strokeRect(sx, sy, obs.w, obs.h);
}

function drawBed(ctx, obs, sx, sy){
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath(); ctx.ellipse(sx + obs.w / 2 + 8, sy + obs.h, obs.w * 0.55, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#75472c";
  ctx.beginPath();
  ctx.moveTo(sx + 8, sy + 17); ctx.lineTo(sx + obs.w - 4, sy + 7); ctx.lineTo(sx + obs.w, sy + obs.h - 14); ctx.lineTo(sx + 12, sy + obs.h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#7ba9d1";
  ctx.beginPath();
  ctx.moveTo(sx + 13, sy + 24); ctx.lineTo(sx + obs.w - 10, sy + 15); ctx.lineTo(sx + obs.w - 7, sy + obs.h - 22); ctx.lineTo(sx + 17, sy + obs.h - 12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#f5ebd6";
  ctx.beginPath(); ctx.moveTo(sx + 16, sy + 25); ctx.lineTo(sx + 48, sy + 21); ctx.lineTo(sx + 49, sy + 38); ctx.lineTo(sx + 18, sy + 42); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.stroke();
}

function drawDesk(ctx, obs, sx, sy){
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath(); ctx.ellipse(sx + obs.w / 2 + 4, sy + obs.h, obs.w * 0.55, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#8c5a34";
  ctx.beginPath(); ctx.moveTo(sx, sy + 12); ctx.lineTo(sx + obs.w * .7, sy); ctx.lineTo(sx + obs.w, sy + 13); ctx.lineTo(sx + obs.w * .27, sy + 25); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#5d3820";
  ctx.fillRect(sx + 10, sy + 23, 8, obs.h - 23);
  ctx.fillRect(sx + obs.w - 18, sy + 19, 8, obs.h - 19);
  ctx.fillStyle = "#f4e8c4";
  ctx.beginPath(); ctx.moveTo(sx + obs.w * .38, sy + 10); ctx.lineTo(sx + obs.w * .59, sy + 6); ctx.lineTo(sx + obs.w * .68, sy + 12); ctx.lineTo(sx + obs.w * .47, sy + 16); ctx.closePath(); ctx.fill();
}

function drawPlant(ctx, obs, sx, sy){
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath(); ctx.ellipse(sx + obs.w / 2, sy + obs.h + 2, obs.w / 2, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#b9683d";
  ctx.fillRect(sx + 7, sy + obs.h * 0.58, obs.w - 14, obs.h * 0.35);
  ctx.fillStyle = "#347a3f";
  for (let i = 0; i < 5; i++){
    ctx.beginPath(); ctx.ellipse(sx + obs.w / 2 + (i - 2) * 5, sy + 15 + (i % 2) * 5, 8, 15, i * 0.5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawBookcase(ctx, obs, sx, sy){
  ctx.fillStyle = "#75472c";
  ctx.fillRect(sx, sy, obs.w, obs.h);
  const colors = ["#d85c4a", "#e5bf58", "#4d89b8", "#78a463"];
  for (let row = 0; row < 3; row++){
    ctx.fillStyle = "#4a2c1d";
    ctx.fillRect(sx + 4, sy + 7 + row * 23, obs.w - 8, 3);
    for (let col = 0; col < 4; col++){
      ctx.fillStyle = colors[(row + col) % colors.length];
      ctx.fillRect(sx + 7 + col * 12, sy + 11 + row * 23, 8, 16);
    }
  }
}

function drawDresser(ctx, obs, sx, sy){
  ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(sx + 5, sy + obs.h, obs.w, 6);
  ctx.fillStyle = "#885738"; ctx.fillRect(sx, sy + 7, obs.w, obs.h - 7);
  ctx.fillStyle = "#b57c4a"; ctx.fillRect(sx + 5, sy + 13, obs.w - 10, 15); ctx.fillRect(sx + 5, sy + 34, obs.w - 10, 15);
  ctx.fillStyle = "#f0c85e"; ctx.fillRect(sx + obs.w / 2 - 3, sy + 19, 6, 4); ctx.fillRect(sx + obs.w / 2 - 3, sy + 40, 6, 4);
}

function drawChair(ctx, obs, sx, sy){
  ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fillRect(sx + 2, sy + obs.h, obs.w, 5);
  ctx.fillStyle = "#79513a"; ctx.fillRect(sx + 5, sy, obs.w - 10, 14); ctx.fillRect(sx + 7, sy + 17, obs.w - 14, 10); ctx.fillRect(sx + 8, sy + 25, 5, obs.h - 25); ctx.fillRect(sx + obs.w - 13, sy + 25, 5, obs.h - 25);
}

function drawLampPost(ctx, obs, sx, sy){
  ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(sx + obs.w / 2, sy + obs.h + 2, 17, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3e4a56"; ctx.fillRect(sx + obs.w / 2 - 4, sy + 20, 8, obs.h - 20); ctx.fillRect(sx + 4, sy + 15, obs.w - 8, 6);
  ctx.fillStyle = "#f7df71"; ctx.fillRect(sx + 5, sy, obs.w - 10, 18); ctx.strokeStyle = "#303945"; ctx.lineWidth = 2; ctx.strokeRect(sx + 5, sy, obs.w - 10, 18);
}

function drawBusStop(ctx, obs, sx, sy){
  ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(sx + 5, sy + obs.h, obs.w, 6);
  ctx.fillStyle = "#4d7388"; ctx.fillRect(sx + 6, sy + 9, 7, obs.h - 9); ctx.fillRect(sx + obs.w - 13, sy + 9, 7, obs.h - 9); ctx.fillRect(sx, sy + 4, obs.w, 8);
  ctx.fillStyle = "rgba(162,220,234,.72)"; ctx.fillRect(sx + 15, sy + 16, obs.w - 30, obs.h - 32);
  ctx.fillStyle = "#7a583d"; ctx.fillRect(sx + 20, sy + obs.h - 20, obs.w - 40, 7);
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
