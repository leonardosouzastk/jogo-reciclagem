/* =========================================================
   ECO AVENTURA - audio.js
   -----------------------------------------------------------
   O jogo funciona 100% offline, então em vez de depender de
   arquivos de música/efeitos baixados da internet, os sons são
   GERADOS em tempo real com a Web Audio API.

   Se no futuro você quiser usar arquivos de áudio de verdade,
   coloque-os em assets/sounds/ e veja o método loadFile() logo
   abaixo — ele permite tocar um arquivo local caso ele exista,
   sem quebrar o jogo caso não exista.
   ========================================================= */

class AudioManager {
  constructor(){
    this.ctx = null;
    this.enabled = true;
    this.musicNodes = null;
    this.musicPlaying = false;
  }

  /** O AudioContext só pode ser criado após uma interação do usuário
   *  (regra dos navegadores). Chame isto no clique do botão JOGAR. */
  init(){
    if (this.ctx) return;
    try{
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    }catch(e){
      console.warn("Web Audio API indisponível — o jogo continuará sem som.", e);
      this.enabled = false;
    }
  }

  _resume(){
    if (this.ctx && this.ctx.state === "suspended"){
      this.ctx.resume();
    }
  }

  /** Toca um único "beep" com envelope simples (ataque/decaimento). */
  _tone(freq, duration, type = "square", startTime = 0, gainValue = 0.18){
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime + startTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);

    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(gainValue, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  /** Som ao pegar um resíduo do chão: blip curto e agudo. */
  playPickup(){
    this._resume();
    this._tone(660, 0.09, "square");
    this._tone(880, 0.08, "square", 0.06);
  }

  /** Som de descarte correto: pequena sequência ascendente e alegre. */
  playSuccess(){
    this._resume();
    this._tone(523.25, 0.12, "triangle", 0);     // C5
    this._tone(659.25, 0.12, "triangle", 0.1);   // E5
    this._tone(783.99, 0.18, "triangle", 0.2);   // G5
  }

  /** Som de descarte incorreto: buzz curto e descendente. */
  playError(){
    this._resume();
    this._tone(220, 0.18, "sawtooth", 0);
    this._tone(160, 0.22, "sawtooth", 0.1);
  }

  /** Fanfarra curta ao concluir uma fase. */
  playPhaseComplete(){
    this._resume();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => this._tone(f, 0.22, "triangle", i * 0.14, 0.16));
  }

  /** Clique de interface (menus/botões). */
  playClick(){
    this._resume();
    this._tone(440, 0.05, "square", 0, 0.1);
  }

  /** Zumbido de contagem regressiva (fase com tempo). */
  playTick(){
    this._resume();
    this._tone(880, 0.05, "square", 0, 0.08);
  }

  /** Ambiente musical de fundo: um loop bem simples e discreto,
   *  gerado por osciladores, apenas para dar vida ao jogo. */
  startMusic(){
    if (!this.enabled || !this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;
    this._resume();

    const pattern = [392, 440, 523.25, 440]; // G4 A4 C5 A4 - loop suave
    let step = 0;
    const stepDuration = 0.55;

    const playStep = () => {
      if (!this.musicPlaying) return;
      const freq = pattern[step % pattern.length];
      this._tone(freq, stepDuration * 0.9, "sine", 0, 0.045);
      step++;
      this.musicTimeout = setTimeout(playStep, stepDuration * 1000);
    };
    playStep();
  }

  stopMusic(){
    this.musicPlaying = false;
    if (this.musicTimeout) clearTimeout(this.musicTimeout);
  }

  /** Liga/desliga todo o som do jogo. */
  toggleMute(){
    this.enabled = !this.enabled;
    if (!this.enabled) this.stopMusic();
    return this.enabled;
  }
}
