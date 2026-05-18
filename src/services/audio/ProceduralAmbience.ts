/**
 * ProceduralAmbience - 程序化环境声合成引擎
 *
 * 用 Web Audio API 合成 8 种循环环境声，零外部文件依赖。
 * 每条环境声 20-30 秒循环，无缝。
 *
 * 合成策略：
 *   - 风声/风沙：filtered noise（白噪声 → bandpass）
 *   - 鸟鸣：短促 sine 脉冲 + 随机间隔
 *   - 水声/海浪：低频 noise 调制
 *   - 烛火/壁炉：crackle synthesis（随机触发短脉冲）
 *   - 翻书/书写：短促 click 组合
 *   - 大厅回响：reverb tail impulse
 *
 * 声音身份：古朴 · 温暖 · 神秘
 */

// ─── 确定性随机 ──────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── 环境声轨道定义 ──────────────────────────────────────────────

export type AmbienceTrack =
  | 'wind_leaves'     // 微风+树叶（仪表盘/户外）
  | 'wind_cold'       // 寒风
  | 'birds'           // 鸟鸣
  | 'sea_waves'       // 海浪
  | 'desert_wind'     // 沙漠风沙
  | 'fire_candle'     // 烛火噼啪
  | 'fire_hearth'     // 壁炉燃烧
  | 'library'         // 图书馆翻书
  | 'writing'         // 书写
  | 'hall_echo';      // 大厅回响

/** 场景到环境声轨道映射 */
export const SCENE_TRACK_MAP: Record<string, AmbienceTrack> = {
  ambient: 'wind_leaves',
  map: 'wind_leaves',
  library: 'library',
  candle: 'fire_candle',
  hall: 'hall_echo',
  writing: 'writing',
};

interface AmbienceTrackConfig {
  duration: number;
  seed: number;
}

const TRACK_CONFIGS: Record<AmbienceTrack, AmbienceTrackConfig> = {
  wind_leaves:   { duration: 20, seed: 100 },
  wind_cold:     { duration: 20, seed: 200 },
  birds:         { duration: 25, seed: 300 },
  sea_waves:     { duration: 20, seed: 400 },
  desert_wind:   { duration: 20, seed: 500 },
  fire_candle:   { duration: 15, seed: 600 },
  fire_hearth:   { duration: 20, seed: 700 },
  library:       { duration: 20, seed: 800 },
  writing:       { duration: 20, seed: 900 },
  hall_echo:     { duration: 20, seed: 1000 },
};

// ─── 合成原语 ──────────────────────────────────────────────────

/**
 * 生成白噪声 buffer
 */
function createNoiseBuffer(ctx: OfflineAudioContext, duration: number): AudioBuffer {
  const length = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return buffer;
}

// ─── 各环境声渲染 ──────────────────────────────────────────────

function renderWindLeaves(ctx: OfflineAudioContext, duration: number, rng: () => number): void {
  const noise = createNoiseBuffer(ctx, duration);
  const source = ctx.createBufferSource();
  source.buffer = noise;

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 800 + rng() * 400;
  bp.Q.value = 0.3;

  const gain = ctx.createGain();
  gain.gain.value = 0.06;

  // LFO 模拟风声波动
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 0.15 + rng() * 0.1;
  lfoGain.gain.value = 0.02;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);

  source.connect(bp);
  bp.connect(gain);
  gain.connect(ctx.destination);

  lfo.start(0);
  source.start(0);
}

function renderWindCold(ctx: OfflineAudioContext, duration: number, rng: () => number): void {
  const noise = createNoiseBuffer(ctx, duration);
  const source = ctx.createBufferSource();
  source.buffer = noise;

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1200 + rng() * 600;
  bp.Q.value = 0.5;

  const gain = ctx.createGain();
  gain.gain.value = 0.08;

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 0.3;
  lfoGain.gain.value = 0.04;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);

  source.connect(bp);
  bp.connect(gain);
  gain.connect(ctx.destination);

  lfo.start(0);
  source.start(0);
}

function renderBirds(ctx: OfflineAudioContext, duration: number, rng: () => number): void {
  // 随机间隔的鸟叫音
  let t = 0;
  while (t < duration) {
    const gap = 1.5 + rng() * 4;
    t += gap;

    if (t >= duration) break;

    const baseFreq = 2000 + rng() * 2000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.linearRampToValueAtTime(baseFreq * (0.8 + rng() * 0.4), t + 0.1);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.04 + rng() * 0.03, t + 0.02);
    gain.gain.linearRampToValueAtTime(0, t + 0.12 + rng() * 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.2);
  }
}

function renderSeaWaves(ctx: OfflineAudioContext, duration: number, rng: () => number): void {
  const noise = createNoiseBuffer(ctx, duration);
  const source = ctx.createBufferSource();
  source.buffer = noise;

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 400;
  lp.Q.value = 0.5;

  const gain = ctx.createGain();
  gain.gain.value = 0.05;

  // 波浪周期调制
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 0.08 + rng() * 0.04;
  lfoGain.gain.value = 0.03;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);

  source.connect(lp);
  lp.connect(gain);
  gain.connect(ctx.destination);

  lfo.start(0);
  source.start(0);
}

function renderDesertWind(ctx: OfflineAudioContext, duration: number, rng: () => number): void {
  const noise = createNoiseBuffer(ctx, duration);
  const source = ctx.createBufferSource();
  source.buffer = noise;

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 600;
  bp.Q.value = 0.8;

  const gain = ctx.createGain();
  gain.gain.value = 0.06;

  // 沙粒感：高频叠加
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2000;

  const gain2 = ctx.createGain();
  gain2.gain.value = 0.015;

  source.connect(bp);
  bp.connect(gain);
  gain.connect(ctx.destination);

  source.connect(hp);
  hp.connect(gain2);
  gain2.connect(ctx.destination);

  source.start(0);
}

function renderFireCandle(ctx: OfflineAudioContext, duration: number, rng: () => number): void {
  // 噪声底噪
  const noise = createNoiseBuffer(ctx, duration);
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noise;

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 3000;
  bp.Q.value = 1.0;

  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.01;

  noiseSrc.connect(bp);
  bp.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseSrc.start(0);

  // 噼啪声
  let t = 0;
  while (t < duration) {
    t += 0.3 + rng() * 1.5;
    if (t >= duration) break;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 100 + rng() * 200;

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.02 + rng() * 0.02, t + 0.003);
    gain.gain.linearRampToValueAtTime(0, t + 0.02);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.03);
  }
}

function renderFireHearth(ctx: OfflineAudioContext, duration: number, rng: () => number): void {
  // 更大的火焰噪声底噪
  const noise = createNoiseBuffer(ctx, duration);
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noise;

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1500;

  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.025;

  noiseSrc.connect(lp);
  lp.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseSrc.start(0);

  // 更多噼啪
  let t = 0;
  while (t < duration) {
    t += 0.2 + rng() * 0.8;
    if (t >= duration) break;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 80 + rng() * 300;

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.03 + rng() * 0.02, t + 0.005);
    gain.gain.linearRampToValueAtTime(0, t + 0.03 + rng() * 0.02);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }
}

function renderLibrary(ctx: OfflineAudioContext, duration: number, rng: () => number): void {
  // 安静的环境噪声底噪
  const noise = createNoiseBuffer(ctx, duration);
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noise;

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 500;

  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.005;

  noiseSrc.connect(lp);
  lp.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseSrc.start(0);

  // 偶尔的翻书声
  let t = 0;
  while (t < duration) {
    t += 3 + rng() * 8;
    if (t >= duration) break;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 200 + rng() * 100;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1500;
    bp.Q.value = 2;

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.02 + rng() * 0.01, t + 0.02);
    gain.gain.linearRampToValueAtTime(0, t + 0.15);

    osc.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }
}

function renderWriting(ctx: OfflineAudioContext, duration: number, rng: () => number): void {
  // 安静底噪
  const noise = createNoiseBuffer(ctx, duration);
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noise;

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 400;

  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.003;

  noiseSrc.connect(lp);
  lp.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseSrc.start(0);

  // 书写声：笔尖划过纸张的连续微弱 noise bursts
  let t = 0.5;
  while (t < duration) {
    const writeDuration = 0.5 + rng() * 2;
    if (t + writeDuration >= duration) break;

    const writeNoise = createNoiseBuffer(ctx, writeDuration);
    const writeSrc = ctx.createBufferSource();
    writeSrc.buffer = writeNoise;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3000;

    const writeGain = ctx.createGain();
    writeGain.gain.value = 0.008 + rng() * 0.005;

    writeSrc.connect(hp);
    hp.connect(writeGain);
    writeGain.connect(ctx.destination);

    writeSrc.start(t);
    t += writeDuration + 1 + rng() * 3;
  }
}

function renderHallEcho(ctx: OfflineAudioContext, duration: number, rng: () => number): void {
  // 持续的低频环境噪声（大厅回响感）
  const noise = createNoiseBuffer(ctx, duration);
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noise;

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 300;

  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.01;

  noiseSrc.connect(lp);
  lp.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseSrc.start(0);

  // 偶尔的脚步回响
  let t = 0;
  while (t < duration) {
    t += 4 + rng() * 10;
    if (t >= duration) break;

    // 脚步 = 短低频 thud
    for (let j = 0; j < 2; j++) {
      const stepTime = t + j * 0.5;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 60 + rng() * 30;

      gain.gain.setValueAtTime(0, stepTime);
      gain.gain.linearRampToValueAtTime(0.03, stepTime + 0.01);
      gain.gain.linearRampToValueAtTime(0, stepTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(stepTime);
      osc.stop(stepTime + 0.5);
    }
  }
}

// ─── 轨道渲染映射 ──────────────────────────────────────────────

const RENDER_MAP: Record<AmbienceTrack, (ctx: OfflineAudioContext, dur: number, rng: () => number) => void> = {
  wind_leaves: renderWindLeaves,
  wind_cold: renderWindCold,
  birds: renderBirds,
  sea_waves: renderSeaWaves,
  desert_wind: renderDesertWind,
  fire_candle: renderFireCandle,
  fire_hearth: renderFireHearth,
  library: renderLibrary,
  writing: renderWriting,
  hall_echo: renderHallEcho,
};

// ─── ProceduralAmbience 引擎 ──────────────────────────────────────

class ProceduralAmbienceEngine {
  private buffers = new Map<string, AudioBuffer>();
  private _ready = false;

  get isReady(): boolean {
    return this._ready;
  }

  async init(ctx: AudioContext): Promise<void> {
    const tracks = Object.keys(TRACK_CONFIGS) as AmbienceTrack[];

    await Promise.all(tracks.map(track => this.renderTrack(ctx, track)));

    this._ready = true;
    console.log(`[ProceduralAmbience] ${tracks.length} ambience tracks rendered`);
  }

  getBuffer(track: AmbienceTrack): AudioBuffer | undefined {
    return this.buffers.get(track);
  }

  private async renderTrack(ctx: AudioContext, track: AmbienceTrack): Promise<void> {
    const config = TRACK_CONFIGS[track];
    const rng = mulberry32(config.seed);
    const sampleRate = ctx.sampleRate;
    const duration = config.duration;
    const length = Math.ceil(sampleRate * duration);

    const offline = new OfflineAudioContext(2, length, sampleRate);
    RENDER_MAP[track](offline, duration, rng);

    try {
      const buffer = await offline.startRendering();
      this.buffers.set(track, buffer);
    } catch (err) {
      console.warn(`[ProceduralAmbience] Failed to render ${track}:`, err);
    }
  }
}

// ─── 导出单例 ──────────────────────────────────────────────────

export const proceduralAmbience = new ProceduralAmbienceEngine();
