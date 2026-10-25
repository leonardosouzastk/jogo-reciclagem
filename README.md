# ♻️ ECO AVENTURA — Uma missão pela reciclagem

Jogo 2D educativo sobre coleta seletiva, em estilo retrô top-down
(inspirado visualmente em jogos clássicos de GBA, sem usar nenhum
personagem, mapa ou sprite protegido). Feito para apresentações
escolares: **funciona 100% offline**, sem servidor, sem internet e
sem instalação — basta abrir um arquivo HTML.

---

## ▶️ Como abrir o jogo

1. Copie a pasta inteira `jogo-reciclagem/` para o computador ou pendrive.
2. Dê duplo clique em **`index.html`** (ou abra pelo navegador com `Ctrl+O`).
3. Pronto — o jogo roda direto no navegador, sem precisar de internet
   ou de instalar nada.

Funciona em qualquer navegador moderno (Chrome, Edge, Firefox).
Recomenda-se o Chrome ou Edge para o melhor desempenho.

Se o jogo for apresentado em uma TV/projetor, use o botão
**"⛶ TELA CHEIA"** no canto superior direito para melhor visualização.

---

## 🎮 Controles

| Tecla | Ação |
|---|---|
| `W` `A` `S` `D` ou Setas | Mover o personagem |
| `E`, `Enter` ou `Espaço` | Pegar resíduo / Descartar na lixeira |
| `ESC` | Pausar o jogo |

---

## 🗺️ Como jogar

1. Explore o mapa e encontre os resíduos espalhados pelo cenário.
2. Ao chegar perto de um resíduo, aparece **"PRESSIONE E PARA PEGAR"**.
3. Leve o resíduo até a lixeira da categoria correta (Papel, Plástico,
   Vidro, Metal ou Orgânico).
4. Perto da lixeira aparece **"PRESSIONE E PARA DESCARTAR"**.
5. Acertos somam pontos e aumentam seu combo. Erros reduzem pontos,
   zeram o combo, tiram uma vida e mostram uma dica educativa explicando o motivo.
   Cada fase tem 3 vidas; o resíduo volta ao mapa após um erro.
6. Complete os 3 níveis (Quarto → Escola → Rua) para
   vencer o jogo!

---

## 📁 Estrutura dos arquivos

```
jogo-reciclagem/
│
├── index.html          → estrutura da página, canvas e telas de menu
├── style.css            → aparência das telas de menu/HUD (CSS puro)
├── README.md             → este arquivo
│
├── js/
│   ├── config.js         → TODAS as variáveis fáceis de ajustar (veja abaixo)
│   ├── utils.js           → funções utilitárias (colisão, distância, etc.)
│   ├── audio.js           → efeitos sonoros gerados via Web Audio API
│   ├── player.js           → classe do personagem (movimento, colisão, desenho)
│   ├── npc.js               → classe dos NPCs (personagens que dão dicas)
│   ├── trash.js              → classe dos resíduos + desenho dos ícones
│   ├── bins.js                 → classe das lixeiras
│   ├── map.js                   → geração do mapa de cada fase (grama, obstáculos, etc.)
│   ├── ui.js                     → HUD, mensagens, prompts e telas de menu
│   ├── game.js                    → o "cérebro" do jogo: estados, pontuação, fases
│   └── main.js                     → ponto de entrada: input, botões, loop principal
│
└── assets/
    ├── images/            → (vazio) — veja "Adicionando sprites" abaixo
    └── sounds/             → (vazio) — todos os sons são gerados por código
```

Os scripts são carregados como **scripts comuns** (sem `type="module"`)
de propósito: módulos ES6 são bloqueados por segurança em vários
navegadores quando o arquivo é aberto direto do disco (`file://`), sem
servidor. Assim, o jogo continua funcionando de qualquer pendrive.

---

## 🔧 Onde ajustar cada coisa

Praticamente **tudo que se costuma querer alterar está em
`js/config.js`**, no topo do arquivo:

| O que mudar | Onde |
|---|---|
| Velocidade do personagem | `CONFIG.PLAYER_SPEED` |
| Tamanho do personagem | `CONFIG.PLAYER_SIZE` |
| Tamanho dos resíduos | `CONFIG.TRASH_SIZE` |
| Velocidade/suavidade da câmera | `CONFIG.CAMERA_SMOOTH` |
| Raio de interação (pegar/descartar) | `CONFIG.INTERACTION_RADIUS` |
| Pontuação por acerto | `CONFIG.SCORE_CORRECT_BASE` |
| Bônus de combo por acerto seguido | `CONFIG.SCORE_COMBO_STEP` |
| Penalidade por erro | `CONFIG.SCORE_WRONG_PENALTY` |
| Duração das mensagens na tela | `CONFIG.MESSAGE_DURATION` / `CONFIG.TIP_DURATION` |
| Tempo da Fase 3 (desafio) | `CONFIG.PHASE_TIME_LIMIT` |

---

## ➕ Como adicionar um novo tipo de resíduo

Edite o objeto `TRASH_TYPES` em `js/config.js`:

```js
const TRASH_TYPES = {
  // ...resíduos existentes,
  PILHA: {
    name: "Pilha usada",
    category: "METAL",      // deve ser uma categoria existente em CATEGORIES
    shape: "can",            // forma de desenho: bottle | can | paper | box | food
    color: "#7a7f85",
  },
};
```

Depois, inclua a chave (`"PILHA"`) no `trashPool` da fase desejada, em
`PHASES` (mesmo arquivo `config.js`).

Se quiser um desenho totalmente novo (não apenas reaproveitar uma forma
existente), adicione um novo `case` na função `drawTrashIcon()` em
`js/trash.js`.

---

## ➕ Como adicionar uma nova lixeira/categoria

Edite o objeto `CATEGORIES` em `js/config.js`:

```js
const CATEGORIES = {
  // ...categorias existentes,
  ELETRONICO: { label: "ELETRÔNICO", color: "#9b59b6", binName: "roxa" },
};
```

Depois:
1. Aponte algum `TRASH_TYPES` para essa nova categoria.
2. Inclua a chave da categoria (`"ELETRONICO"`) no array `binOrder`
   dentro de `js/map.js` (método `_generate`, seção "Estação de coleta
   seletiva"), para que uma lixeira dela seja criada no mapa.

---

## ➕ Como criar uma nova fase

Adicione um novo objeto ao array `PHASES` em `js/config.js`:

```js
const PHASES = [
  // ...fases existentes,
  {
    id: 4,
    name: "FASE 4 — MEU NOVO NÍVEL",
    mapWidthTiles: 40,        // largura do mapa em tiles (tile = 64px)
    mapHeightTiles: 24,        // altura do mapa em tiles
    trashCount: 10,             // quantos resíduos precisam ser reciclados
    trashPool: ["PET", "LATA", "VIDRO_G"], // tipos de resíduo que podem aparecer
    obstacleDensity: 30,         // quantidade de obstáculos internos (árvores, pedras...)
    timeLimit: null,              // ou um número de segundos, para fase cronometrada
    theme: "meu-nivel",
  },
];
```

O mapa, os resíduos, as lixeiras e os NPCs dessa fase são gerados
automaticamente pelo `GameMap` (`js/map.js`) a partir desses
parâmetros — não é necessário desenhar o mapa manualmente.

---

## 🖼️ Adicionando sprites/imagens no futuro

Atualmente todo o visual é desenhado diretamente no Canvas (formas
geométricas), para não depender de nenhum arquivo externo. Isso deixa
o projeto 100% portátil.

Se no futuro você tiver sprites em PNG:

1. Coloque os arquivos em `assets/images/`.
2. Em `js/player.js`, `js/npc.js`, `js/trash.js`, `js/bins.js` e
   `js/map.js`, cada classe tem um método `draw(ctx, screenX, screenY)`
   — substitua o conteúdo desse método por um `ctx.drawImage(...)`
   usando a imagem carregada, no lugar dos desenhos com formas.
3. Carregue as imagens com `new Image()` e `img.src = "assets/images/seu-arquivo.png"`
   antes de iniciar o jogo (por exemplo, em `main.js`).

## 🔊 Adicionando músicas/efeitos sonoros de verdade

Por padrão, todos os sons são **gerados por código** com a Web Audio
API (em `js/audio.js`), então o jogo nunca depende de arquivos de
áudio para funcionar. Se quiser usar arquivos de som de verdade:

1. Coloque os arquivos (`.mp3`/`.ogg`/`.wav`) em `assets/sounds/`.
2. Em `js/audio.js`, crie objetos `Audio` apontando para esses arquivos
   (ex.: `new Audio("assets/sounds/acerto.mp3")`) e toque-os nos
   métodos `playSuccess()`, `playError()`, etc., no lugar dos sons
   sintetizados — ou em conjunto com eles.

---

## ✅ Checklist de funcionamento

Este projeto foi verificado (sintaxe de todos os arquivos JS + uma
simulação automatizada de todas as fases, coletas, descartes certos e
errados, combo, tempo esgotado e finalização do jogo) antes da entrega,
garantindo que roda sem erros ao abrir `index.html` diretamente do
disco, sem qualquer servidor.

Bom jogo, e boa apresentação! 🌱♻️
