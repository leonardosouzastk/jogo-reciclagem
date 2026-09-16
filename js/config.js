/* =========================================================
   ECO AVENTURA - config.js
   -----------------------------------------------------------
   Todas as variáveis que alguém normalmente vai querer ajustar
   (velocidade, pontuação, tamanho de mapa, duração de fases...)
   estão centralizadas aqui. Altere estes valores livremente.
   ========================================================= */

const CONFIG = {
  // ---- Tela / Canvas ----
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,
  TILE_SIZE: 64,

  // ---- Jogador ----
  PLAYER_SPEED: 240,        // pixels por segundo
  PLAYER_SIZE: 40,          // largura/altura da caixa de colisão
  PLAYER_ANIM_FRAME_TIME: 0.12, // segundos por quadro de animação de caminhada

  // ---- Câmera ----
  CAMERA_SMOOTH: 8,         // quanto maior, mais rápido a câmera "gruda" no jogador

  // ---- Interação ----
  INTERACTION_RADIUS: 68,   // distância para poder pegar/descartar
  NPC_TALK_RADIUS: 90,      // distância para o NPC falar

  // ---- Pontuação ----
  SCORE_CORRECT_BASE: 100,  // pontos por acerto (1º acerto do combo)
  SCORE_COMBO_STEP: 20,     // pontos extras a cada acerto consecutivo
  SCORE_WRONG_PENALTY: -50, // pontos perdidos por erro
  SCORE_MIN: 0,             // pontuação nunca fica negativa

  // ---- Mensagens/feedback ----
  MESSAGE_DURATION: 1900,   // ms que a mensagem de acerto/erro fica visível
  FLOATING_TEXT_DURATION: 1100, // ms do texto "+100"/"-50" subindo
  TIP_DURATION: 3600,       // ms da dica educativa (erro) na tela

  // ---- Fases ----
  PHASE_TIME_LIMIT: 90,     // segundos disponíveis na Fase 3 (desafio)

  // ---- Diálogo de NPC ----
  DIALOGUE_FADE: 0.25,      // segundos para o balão de fala aparecer/sumir
};

/* =========================================================
   TIPOS DE RESÍDUO
   Para adicionar um novo resíduo, basta criar uma nova entrada
   aqui com uma categoria válida (veja CATEGORIES abaixo) e uma
   cor/forma para o desenho placeholder no Canvas.
   ========================================================= */
const CATEGORIES = {
  PLASTICO: { label: "PLÁSTICO", color: "#4fa8d8", binName: "azul" },
  PAPEL:    { label: "PAPEL",    color: "#f4d35e", binName: "amarela" },
  VIDRO:    { label: "VIDRO",    color: "#4caf6d", binName: "verde" },
  METAL:    { label: "METAL",    color: "#d7dde0", binName: "cinza" },
  ORGANICO: { label: "ORGÂNICO", color: "#8d5a3b", binName: "marrom" },
};

const TRASH_TYPES = {
  PET:     { name: "Garrafa PET",       category: "PLASTICO", shape: "bottle",  color: "#5ec2f0" },
  LATA:    { name: "Lata de Alumínio",  category: "METAL",    shape: "can",     color: "#c7d1d6" },
  JORNAL:  { name: "Jornal",            category: "PAPEL",    shape: "paper",   color: "#efe3c0" },
  PAPELAO: { name: "Caixa de Papelão",  category: "PAPEL",    shape: "box",     color: "#c69a63" },
  VIDRO_G: { name: "Garrafa de Vidro",  category: "VIDRO",    shape: "bottle",  color: "#5cb86f" },
  COMIDA:  { name: "Resto de Comida",   category: "ORGANICO", shape: "food",    color: "#9c6b3e" },
};

/* =========================================================
   DICAS EDUCATIVAS
   Mostradas quando o jogador erra a lixeira.
   ========================================================= */
function getWrongTip(trashKey){
  const t = TRASH_TYPES[trashKey];
  const cat = CATEGORIES[t.category];
  return `Essa ${t.name.toLowerCase()} é de ${cat.label}. Procure a lixeira ${cat.binName}.`;
}

/* =========================================================
   DIÁLOGOS DOS NPCs (curtos e educativos)
   ========================================================= */
const NPC_DIALOGUES = {
  guia: [
    "Olá! Você sabia que separar corretamente os resíduos ajuda na reciclagem?",
    "Cada tipo de lixo tem um destino: plástico, papel, vidro, metal ou orgânico.",
  ],
  dicas: [
    "Dica: latas de alumínio pertencem à coleta de METAL.",
    "Dica: garrafas PET viram até tecido de roupas quando recicladas!",
    "Dica: vidro nunca se decompõe na natureza — sempre recicle.",
    "Dica: restos de comida são ORGÂNICOS, nunca misture com recicláveis.",
  ],
};

/* =========================================================
   DEFINIÇÃO DAS FASES
   Para criar uma nova fase, adicione um novo objeto neste array.
   Veja o README.md para instruções detalhadas.
   ========================================================= */
const PHASES = [
  {
    id: 1,
    name: "FASE 1 — PARQUE",
    mapWidthTiles: 30,
    mapHeightTiles: 18,
    trashCount: 5,
    trashPool: ["PET", "LATA", "JORNAL"],
    obstacleDensity: 14,
    timeLimit: null,
    theme: "parque",
  },
  {
    id: 2,
    name: "FASE 2 — CIDADE",
    mapWidthTiles: 40,
    mapHeightTiles: 24,
    trashCount: 8,
    trashPool: ["PET", "LATA", "JORNAL", "PAPELAO", "VIDRO_G"],
    obstacleDensity: 26,
    timeLimit: null,
    theme: "cidade",
  },
  {
    id: 3,
    name: "FASE 3 — DESAFIO DA RECICLAGEM",
    mapWidthTiles: 46,
    mapHeightTiles: 28,
    trashCount: 12,
    trashPool: ["PET", "LATA", "JORNAL", "PAPELAO", "VIDRO_G", "COMIDA"],
    obstacleDensity: 38,
    timeLimit: CONFIG.PHASE_TIME_LIMIT,
    theme: "desafio",
  },
];
