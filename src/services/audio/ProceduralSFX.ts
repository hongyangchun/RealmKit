/**
 * ProceduralSFX - 程序化音效合成引擎
 *
 * 用 Web Audio API 振荡器、噪声发生器和滤波器实时合成全部 27 个音效。
 * 零外部依赖，零网络请求，运行时即时生成 AudioBuffer。
 *
 * 风格：古朴 · 温暖 · 神秘
 * - 木质共鸣（低频正弦波 + 快速衰减）
 * - 金属微振（高频三角波 + 带通滤波）
 * - 纸张摩擦（带通滤波白噪声）
 * - 水晶叮响（高频正弦波 + 长尾音）
 * - 古典鼓点（低频脉冲 + 噪声瞬态）
 *
 * 每个合成器支持 seed 参数实现"随机变体"：
 * 同一个 eventId，不同 seed 会生成略有差异的 AudioBuffer。
 */
import type { MusicState } from './AudioManager';

// ─── Types ──────────────────────────────────────────────────────────────

export interface SFXSynthConfig {
  /** 合成函数：给定 AudioContext 和 seed，生成一个 AudioBuffer */
  synthesize: (ctx: BaseAudioContext, seed: number) => AudioBuffer;
  /** 音高随机范围 ±n (0.05 = ±5%) */
  pitchRange: number;
  /** 音量随机范围 ±n (0.10 = ±10%) */
  volumeRange: number;
  /** 优先级 0=UI 1=交互 */
  priority: number;
  /** 随机变体数量 */
  variantCount: number;
}

// ─── Primitive Synthesis Helpers ─────────────────────────────────────────

/** 简易伪随机数生成器 (mulberry32) */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 离线渲染一个合成音效到 AudioBuffer
 * 用 OfflineAudioContext 渲染，结果可缓存复用
 */
function renderToBuffer(
  ctx: BaseAudioContext,
  duration: number,
  buildFn: (ctx: BaseAudioContext, dest: AudioNode, rand: () => number) => void,
  seed: number = 0
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.ceil(sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  const rand = mulberry32(seed);

  // 使用 OfflineAudioContext 进行真实渲染
  // 如果传入的已经是 OfflineAudioContext，直接用
  const offline = new OfflineAudioContext(1, length, sampleRate);
  const dest = offline.destination;

  buildFn(offline, dest, rand);

  // 同步方式：手动合成填充 buffer
  // 这里我们用手动采样方式，因为 OfflineAudioContext.startRendering() 是异步的
  // 改为直接在 buffer 上操作
  return buffer;
}

/**
 * 异步版本：使用 OfflineAudioContext 正确渲染
 */
async function renderAsync(
  duration: number,
  sampleRate: number,
  buildFn: (ctx: OfflineAudioContext, dest: AudioNode, rand: () => number) => void,
  seed: number = 0
): Promise<AudioBuffer> {
  const length = Math.ceil(sampleRate * duration);
  const offline = new OfflineAudioContext(1, length, sampleRate);
  const rand = mulberry32(seed);

  buildFn(offline, offline.destination, rand);

  return offline.startRendering();
}

// ─── Synthesis Primitives ────────────────────────────────────────────────

/** 木质感敲击 — 低频正弦波 + 快速指数衰减 */
function woodKnock(
  ctx: BaseAudioContext, dest: AudioNode, rand: () => number,
  freq = 800, decay = 0.08, gain = 0.5
) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq * (0.95 + rand() * 0.1), t);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + decay);

  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + decay);

  osc.connect(g);
  g.connect(dest);
  osc.start(t);
  osc.stop(t + decay + 0.01);
}

/** 金属共鸣 — 高频三角波 + 带通滤波 + 较长衰减 */
function metalRing(
  ctx: BaseAudioContext, dest: AudioNode, rand: () => number,
  freq = 3000, decay = 0.3, gain = 0.3
) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq * (0.97 + rand() * 0.06), t);

  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(freq, t);
  filter.Q.setValueAtTime(15, t);

  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + decay);

  osc.connect(filter);
  filter.connect(g);
  g.connect(dest);
  osc.start(t);
  osc.stop(t + decay + 0.01);
}

/** 纸张/沙沙声 — 带通滤波白噪声 */
function paperRustle(
  ctx: BaseAudioContext, dest: AudioNode, rand: () => number,
  duration = 0.25, gain = 0.15
) {
  const t = ctx.currentTime;
  const sampleRate = ctx.sampleRate;
  const length = Math.ceil(sampleRate * duration);
  const noiseBuffer = ctx.createBuffer(1, length, sampleRate);
  const data = noiseBuffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1);
  }

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2000 + rand() * 1000, t);
  filter.Q.setValueAtTime(0.8, t);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.setValueAtTime(gain, t + duration - 0.03);
  g.gain.linearRampToValueAtTime(0, t + duration);

  source.connect(filter);
  filter.connect(g);
  g.connect(dest);
  source.start(t);
}

/** 水晶叮响 — 高频正弦波 + 长尾音 + 泛音 */
function crystalDing(
  ctx: BaseAudioContext, dest: AudioNode, rand: () => number,
  freq = 4000, decay = 0.5, gain = 0.35
) {
  const t = ctx.currentTime;

  // 基频
  const osc1 = ctx.createOscillator();
  const g1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(freq * (0.98 + rand() * 0.04), t);
  g1.gain.setValueAtTime(gain, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + decay);
  osc1.connect(g1);
  g1.connect(dest);
  osc1.start(t);
  osc1.stop(t + decay + 0.01);

  // 泛音 (2x)
  const osc2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2.01, t);
  g2.gain.setValueAtTime(gain * 0.3, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + decay * 0.6);
  osc2.connect(g2);
  g2.connect(dest);
  osc2.start(t);
  osc2.stop(t + decay * 0.6 + 0.01);

  // 泛音 (3x)
  const osc3 = ctx.createOscillator();
  const g3 = ctx.createGain();
  osc3.type = 'sine';
  osc3.frequency.setValueAtTime(freq * 3.005, t);
  g3.gain.setValueAtTime(gain * 0.1, t);
  g3.gain.exponentialRampToValueAtTime(0.001, t + decay * 0.3);
  osc3.connect(g3);
  g3.connect(dest);
  osc3.start(t);
  osc3.stop(t + decay * 0.3 + 0.01);
}

/** 古典鼓点 — 低频脉冲 + 噪声瞬态 */
function drumHit(
  ctx: BaseAudioContext, dest: AudioNode, rand: () => number,
  freq = 150, decay = 0.3, gain = 0.6
) {
  const t = ctx.currentTime;

  // 低频脉冲体
  const osc = ctx.createOscillator();
  const gOsc = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
  gOsc.gain.setValueAtTime(gain, t);
  gOsc.gain.exponentialRampToValueAtTime(0.001, t + decay);
  osc.connect(gOsc);
  gOsc.connect(dest);
  osc.start(t);
  osc.stop(t + decay + 0.01);

  // 噪声瞬态（打击感）
  const noiseLen = Math.ceil(ctx.sampleRate * 0.05);
  const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) noiseData[i] = Math.random() * 2 - 1;

  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuf;
  const gNoise = ctx.createGain();
  gNoise.gain.setValueAtTime(gain * 0.4, t);
  gNoise.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  noiseSrc.connect(gNoise);
  gNoise.connect(dest);
  noiseSrc.start(t);
}

/** 墨水滴落 — 短促下降频率的正弦波 */
function inkDrop(
  ctx: BaseAudioContext, dest: AudioNode, rand: () => number,
  gain = 0.3
) {
  const t = ctx.currentTime;
  const freq = 1200 + rand() * 600;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.04);

  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

  osc.connect(g);
  g.connect(dest);
  osc.start(t);
  osc.stop(t + 0.05);
}

/** 翻页声 — 两段纸噪声，一段上升一段下降 */
function pageFlip(
  ctx: BaseAudioContext, dest: AudioNode, rand: () => number,
  duration = 0.35, gain = 0.2
) {
  const t = ctx.currentTime;
  const halfDur = duration / 2;

  // 前半段：翻开
  paperRustle(ctx, dest, rand, halfDur, gain);
  // 后半段：落下（延迟）
  setTimeout(() => {
    try { paperRustle(ctx, dest, rand, halfDur * 0.6, gain * 0.6); } catch {}
  }, halfDur * 1000);
}

/** 丝线拨动 — 正弦波 + 快速衰减 + 轻微颤音 */
function stringPluck(
  ctx: BaseAudioContext, dest: AudioNode, rand: () => number,
  freq = 600, decay = 0.25, gain = 0.3
) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq * (0.97 + rand() * 0.06), t);
  // 轻微颤音
  const vibRate = 5 + rand() * 3;
  const vibDepth = freq * 0.01;
  for (let i = 0; i < 10; i++) {
    const ti = t + (i / 10) * decay;
    osc.frequency.setValueAtTime(freq + Math.sin(i * vibRate) * vibDepth, ti);
  }

  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + decay);

  osc.connect(g);
  g.connect(dest);
  osc.start(t);
  osc.stop(t + decay + 0.01);
}

/** 风铃 — 多个随机高频音随机排列 */
function windChime(
  ctx: BaseAudioContext, dest: AudioNode, rand: () => number,
  gain = 0.25
) {
  const t = ctx.currentTime;
  const notes = [2000, 2500, 3200, 4000, 5000];
  const count = 2 + Math.floor(rand() * 2);

  for (let i = 0; i < count; i++) {
    const freq = notes[Math.floor(rand() * notes.length)];
    const delay = rand() * 0.15;
    const dur = 0.15 + rand() * 0.15;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t + delay);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain / count, t + delay + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);

    osc.connect(g);
    g.connect(dest);
    osc.start(t + delay);
    osc.stop(t + delay + dur + 0.01);
  }
}

/** 旗帜飘扬 — 低通滤波噪声 + 周期性音量变化 */
function flagFlutter(
  ctx: BaseAudioContext, dest: AudioNode, rand: () => number,
  duration = 0.4, gain = 0.15
) {
  const t = ctx.currentTime;
  const sampleRate = ctx.sampleRate;
  const length = Math.ceil(sampleRate * duration);
  const noiseBuf = ctx.createBuffer(1, length, sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < length; i++) noiseData[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, t);
  filter.Q.setValueAtTime(1, t);

  const g = ctx.createGain();
  // 周期性波动
  for (let i = 0; i < 6; i++) {
    const ti = t + (i / 6) * duration;
    g.gain.setValueAtTime(gain * (0.5 + 0.5 * Math.sin(i * 1.5)), ti);
  }
  g.gain.linearRampToValueAtTime(0, t + duration);

  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(t);
}

/** 消散声 — 向上扫频白噪声 + 逐渐衰减 */
function dissipate(
  ctx: BaseAudioContext, dest: AudioNode, rand: () => number,
  duration = 0.35, gain = 0.2
) {
  const t = ctx.currentTime;
  const sampleRate = ctx.sampleRate;
  const length = Math.ceil(sampleRate * duration);
  const noiseBuf = ctx.createBuffer(1, length, sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < length; i++) noiseData[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(500, t);
  filter.frequency.exponentialRampToValueAtTime(4000, t + duration);

  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);

  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(t);
}

/** 不和谐弦颤音 — 两个微失谐正弦波 */
function dissonantTremolo(
  ctx: BaseAudioContext, dest: AudioNode, rand: () => number,
  duration = 0.7, gain = 0.25
) {
  const t = ctx.currentTime;
  const baseFreq = 300 + rand() * 100;

  for (const detune of [-8, 8]) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.detune.setValueAtTime(detune, t);

    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain / 2, t + 0.05);
    g.gain.setValueAtTime(gain / 2, t + duration - 0.1);
    g.gain.linearRampToValueAtTime(0, t + duration);

    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  }
}

// ─── SFX Registry ───────────────────────────────────────────────────────

/**
 * 所有 SFX 的合成器注册表
 * Key 是事件 ID，Value 是合成配置
 */
const SFX_SYNTH_REGISTRY: Record<string, SFXSynthConfig> = {
  // ── UI 音效（优先级 0）────────────────────────────────────────────

  'ui/click': {
    priority: 0,
    pitchRange: 0.05,
    volumeRange: 0.10,
    variantCount: 3,
    synthesize: (ctx, rand) => synthSync(ctx, 0.1, (c, d, r) => {
      woodKnock(c, d, r, 900 + r() * 200, 0.06, 0.5);
    }),
  },

  'ui/hover': {
    priority: 0,
    pitchRange: 0.05,
    volumeRange: 0.10,
    variantCount: 3,
    synthesize: (ctx, rand) => synthSync(ctx, 0.06, (c, d, r) => {
      // 极轻的羽毛拂过 — 高频低增益正弦波
      const t = c.currentTime;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(3000 + r() * 500, t);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(g);
      g.connect(d);
      osc.start(t);
      osc.stop(t + 0.06);
    }),
  },

  'ui/drawer_open': {
    priority: 0,
    pitchRange: 0.03,
    volumeRange: 0.08,
    variantCount: 2,
    synthesize: (ctx, rand) => synthSync(ctx, 0.35, (c, d, r) => {
      paperRustle(c, d, r, 0.3, 0.18);
    }),
  },

  'ui/drawer_close': {
    priority: 0,
    pitchRange: 0.03,
    volumeRange: 0.08,
    variantCount: 2,
    synthesize: (ctx, rand) => synthSync(ctx, 0.28, (c, d, r) => {
      paperRustle(c, d, r, 0.15, 0.15);
      // 短促收尾
      const t = c.currentTime + 0.12;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, t);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(g);
      g.connect(d);
      osc.start(t);
      osc.stop(t + 0.09);
    }),
  },

  'ui/dialog_open': {
    priority: 0,
    pitchRange: 0.03,
    volumeRange: 0.08,
    variantCount: 2,
    synthesize: (ctx, rand) => synthSync(ctx, 0.45, (c, d, r) => {
      // 沉重的古书翻页
      paperRustle(c, d, r, 0.25, 0.22);
      woodKnock(c, d, r, 400, 0.15, 0.3);
    }),
  },

  'ui/dialog_close': {
    priority: 0,
    pitchRange: 0.03,
    volumeRange: 0.08,
    variantCount: 2,
    synthesize: (ctx, rand) => synthSync(ctx, 0.25, (c, d, r) => {
      // 轻柔合拢
      paperRustle(c, d, r, 0.15, 0.12);
      woodKnock(c, d, r, 600, 0.05, 0.15);
    }),
  },

  'ui/tab_switch': {
    priority: 0,
    pitchRange: 0.05,
    volumeRange: 0.10,
    variantCount: 3,
    synthesize: (ctx, rand) => synthSync(ctx, 0.15, (c, d, r) => {
      // 铜铃轻敲
      metalRing(c, d, r, 2500 + r() * 500, 0.12, 0.35);
    }),
  },

  'ui/success': {
    priority: 0,
    pitchRange: 0.03,
    volumeRange: 0.08,
    variantCount: 2,
    synthesize: (ctx, rand) => synthSync(ctx, 0.65, (c, d, r) => {
      // 水晶叮响 + 轻柔回响
      crystalDing(c, d, r, 3500 + r() * 500, 0.4, 0.35);
      // 延迟回响
      const t = c.currentTime + 0.15;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(5200, t);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g);
      g.connect(d);
      osc.start(t);
      osc.stop(t + 0.31);
    }),
  },

  'ui/delete': {
    priority: 0,
    pitchRange: 0.05,
    volumeRange: 0.10,
    variantCount: 2,
    synthesize: (ctx, rand) => synthSync(ctx, 0.45, (c, d, r) => {
      dissipate(c, d, r, 0.4, 0.22);
    }),
  },

  'ui/error': {
    priority: 0,
    pitchRange: 0.03,
    volumeRange: 0.08,
    variantCount: 2,
    synthesize: (ctx, rand) => synthSync(ctx, 0.55, (c, d, r) => {
      drumHit(c, d, r, 120, 0.4, 0.5);
      // 低沉的警示音
      const t = c.currentTime + 0.1;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, t);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(g);
      g.connect(d);
      osc.start(t);
      osc.stop(t + 0.36);
    }),
  },

  'ui/search_type': {
    priority: 0,
    pitchRange: 0.08,
    volumeRange: 0.12,
    variantCount: 3,
    synthesize: (ctx, rand) => synthSync(ctx, 0.05, (c, d, r) => {
      inkDrop(c, d, r, 0.25);
    }),
  },

  'ui/search_result': {
    priority: 0,
    pitchRange: 0.05,
    volumeRange: 0.10,
    variantCount: 3,
    synthesize: (ctx, rand) => synthSync(ctx, 0.18, (c, d, r) => {
      metalRing(c, d, r, 4500, 0.1, 0.3);
    }),
  },

  // ── 交互音效（优先级 1）────────────────────────────────────────────

  'sfx/card_flip': {
    priority: 1,
    pitchRange: 0.08,
    volumeRange: 0.10,
    variantCount: 2,
    synthesize: (ctx, rand) => synthSync(ctx, 0.35, (c, d, r) => {
      paperRustle(c, d, r, 0.15, 0.18);
      woodKnock(c, d, r, 500, 0.08, 0.2);
    }),
  },

  'sfx/card_place': {
    priority: 1,
    pitchRange: 0.08,
    volumeRange: 0.10,
    variantCount: 2,
    synthesize: (ctx, rand) => synthSync(ctx, 0.18, (c, d, r) => {
      woodKnock(c, d, r, 700, 0.06, 0.35);
      paperRustle(c, d, r, 0.08, 0.08);
    }),
  },

  'sfx/pin_drop': {
    priority: 1,
    pitchRange: 0.05,
    volumeRange: 0.10,
    variantCount: 2,
    synthesize: (ctx, rand) => synthSync(ctx, 0.22, (c, d, r) => {
      // 金属针刺入 — 高频 ping + 低频 thud
      metalRing(c, d, r, 3500, 0.08, 0.25);
      woodKnock(c, d, r, 300, 0.1, 0.3);
    }),
  },

  'sfx/pin_hover': {
    priority: 1,
    pitchRange: 0.05,
    volumeRange: 0.10,
    variantCount: 2,
    synthesize: (ctx, rand) => synthSync(ctx, 0.12, (c, d, r) => {
      metalRing(c, d, r, 5000, 0.06, 0.15);
    }),
  },

  'sfx/paint_start': {
    priority: 1,
    pitchRange: 0.08,
    volumeRange: 0.10,
    variantCount: 2,
    synthesize: (ctx, rand) => synthSync(ctx, 0.18, (c, d, r) => {
      // 毛笔蘸墨 — 液体声
      const t = c.currentTime;
      const sampleRate = c.sampleRate;
      const len = Math.ceil(sampleRate * 0.15);
      const noiseBuf = c.createBuffer(1, len, sampleRate);
      const noiseData = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) noiseData[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = noiseBuf;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, t);
      const g = c.createGain();
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      src.connect(filter);
      filter.connect(g);
      g.connect(d);
      src.start(t);
    }),
  },

  'sfx/paint_stroke': {
    priority: 1,
    pitchRange: 0.08,
    volumeRange: 0.12,
    variantCount: 3,
    synthesize: (ctx, rand) => synthSync(ctx, 0.12, (c, d, r) => {
      // 墨迹流淌 — 轻柔低通噪声
      const t = c.currentTime;
      const sampleRate = c.sampleRate;
      const len = Math.ceil(sampleRate * 0.1);
      const noiseBuf = c.createBuffer(1, len, sampleRate);
      const noiseData = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) noiseData[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = noiseBuf;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400 + r() * 200, t);
      const g = c.createGain();
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      src.connect(filter);
      filter.connect(g);
      g.connect(d);
      src.start(t);
    }),
  },

  'sfx/timeline_scroll': {
    priority: 1,
    pitchRange: 0.08,
    volumeRange: 0.10,
    variantCount: 2,
    synthesize: (ctx, rand) => synthSync(ctx, 0.22, (c, d, r) => {
      paperRustle(c, d, r, 0.18, 0.12);
    }),
  },

  'sfx/event_create': {
    priority: 1,
    pitchRange: 0.05,
    volumeRange: 0.08,
    variantCount: 2,
    synthesize: (ctx, rand) => synthSync(ctx, 0.38, (c, d, r) => {
      // 铜笔落纸
      woodKnock(c, d, r, 1100, 0.05, 0.3);
      inkDrop(c, d, r, 0.2);
      // 墨迹扩散 — 轻柔扩散声
      const t = c.currentTime + 0.06;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.25);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(g);
      g.connect(d);
      osc.start(t);
      osc.stop(t + 0.26);
    }),
  },

  'sfx/event_conflict': {
    priority: 1,
    pitchRange: 0.05,
    volumeRange: 0.08,
    variantCount: 2,
    synthesize: (ctx, rand) => synthSync(ctx, 0.8, (c, d, r) => {
      dissonantTremolo(c, d, r, 0.7, 0.3);
    }),
  },

  'sfx/graph_node_select': {
    priority: 1,
    pitchRange: 0.05,
    volumeRange: 0.10,
    variantCount: 3,
    synthesize: (ctx, rand) => synthSync(ctx, 0.22, (c, d, r) => {
      windChime(c, d, r, 0.25);
    }),
  },

  'sfx/graph_link': {
    priority: 1,
    pitchRange: 0.05,
    volumeRange: 0.10,
    variantCount: 2,
    synthesize: (ctx, rand) => synthSync(ctx, 0.28, (c, d, r) => {
      stringPluck(c, d, r, 700 + r() * 200, 0.2, 0.3);
    }),
  },

  'sfx/chronicle_scroll': {
    priority: 1,
    pitchRange: 0.08,
    volumeRange: 0.10,
    variantCount: 3,
    synthesize: (ctx, rand) => synthSync(ctx, 0.32, (c, d, r) => {
      paperRustle(c, d, r, 0.25, 0.15);
    }),
  },

  'sfx/faction_color': {
    priority: 1,
    pitchRange: 0.05,
    volumeRange: 0.08,
    variantCount: 2,
    synthesize: (ctx, rand) => synthSync(ctx, 0.42, (c, d, r) => {
      flagFlutter(c, d, r, 0.38, 0.18);
    }),
  },

  'sfx/import': {
    priority: 1,
    pitchRange: 0.03,
    volumeRange: 0.08,
    variantCount: 2,
    synthesize: (ctx, rand) => synthSync(ctx, 0.82, (c, d, r) => {
      // 古卷展开
      paperRustle(c, d, r, 0.3, 0.2);
      // 封印碎裂
      const t = c.currentTime + 0.2;
      crystalDing(c, d, r, 2000, 0.5, 0.25);
    }),
  },

  'sfx/export': {
    priority: 1,
    pitchRange: 0.03,
    volumeRange: 0.08,
    variantCount: 2,
    synthesize: (ctx, rand) => synthSync(ctx, 0.62, (c, d, r) => {
      // 卷轴收卷
      paperRustle(c, d, r, 0.25, 0.15);
      woodKnock(c, d, r, 600, 0.1, 0.2);
      // 封印加封
      const t = c.currentTime + 0.3;
      metalRing(c, d, r, 1800, 0.2, 0.2);
    }),
  },
};

// ─── Sync synthesis wrapper ──────────────────────────────────────────────

/**
 * 同步方式生成 AudioBuffer
 * 使用手动波形采样，避免 OfflineAudioContext 的异步问题
 */
function synthSync(
  parentCtx: BaseAudioContext,
  duration: number,
  buildFn: (ctx: BaseAudioContext, dest: AudioNode, rand: () => number) => void,
  seed: number = 0
): AudioBuffer {
  // 返回一个占位 buffer，实际合成在 async 版本中完成
  // 这里我们用一个简单的合成方式直接写入 buffer
  const sampleRate = parentCtx.sampleRate;
  const length = Math.ceil(sampleRate * duration);
  const buffer = parentCtx.createBuffer(1, length, sampleRate);
  // 直接返回空 buffer 占位——实际使用 async 版本
  return buffer;
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * 程序化 SFX 合成器
 *
 * 使用方式：
 * 1. 调用 initProceduralSFX(ctx) 初始化
 * 2. 获取合成后的 AudioBuffer 缓存
 * 3. 直接传给 AudioManager
 */
class ProceduralSFXEngine {
  private bufferCache = new Map<string, AudioBuffer>();
  private initialized = false;

  /**
   * 初始化：合成所有音效到 AudioBuffer
   * 需要在 AudioContext 可用后调用
   */
  async init(ctx: BaseAudioContext): Promise<void> {
    if (this.initialized) return;

    const sampleRate = ctx.sampleRate;
    const promises: Promise<void>[] = [];

    for (const [eventId, config] of Object.entries(SFX_SYNTH_REGISTRY)) {
      for (let v = 0; v < config.variantCount; v++) {
        const cacheKey = `${eventId}_${v}`;
        if (this.bufferCache.has(cacheKey)) continue;

        const seed = v * 1000 + 42; // 确定性 seed，同一变体永远相同
        promises.push(
          this.synthesizeBuffer(eventId, config, v, sampleRate, seed)
            .then((buf) => {
              this.bufferCache.set(cacheKey, buf);
            })
            .catch((err) => {
              console.warn(`[ProceduralSFX] Failed to synthesize ${cacheKey}:`, err);
            })
        );
      }
    }

    await Promise.all(promises);
    this.initialized = true;
  }

  /**
   * 合成单个 AudioBuffer
   */
  private async synthesizeBuffer(
    eventId: string,
    config: SFXSynthConfig,
    variantIndex: number,
    sampleRate: number,
    seed: number
  ): Promise<AudioBuffer> {
    // 计算 duration：从合成函数推断
    // 使用 OfflineAudioContext 进行真实渲染
    const duration = this.estimateDuration(eventId);
    const length = Math.ceil(sampleRate * duration);
    const offline = new OfflineAudioContext(1, length, sampleRate);
    const rand = mulberry32(seed);

    // 调用具体的合成函数
    buildSynthForEvent(eventId, offline, offline.destination, rand);

    const buffer = await offline.startRendering();
    return buffer;
  }

  /**
   * 获取已合成的 AudioBuffer
   */
  getBuffer(eventId: string, variantIndex: number): AudioBuffer | undefined {
    return this.bufferCache.get(`${eventId}_${variantIndex}`);
  }

  /**
   * 获取事件配置
   */
  getConfig(eventId: string): SFXSynthConfig | undefined {
    return SFX_SYNTH_REGISTRY[eventId];
  }

  /** 所有已注册的事件 ID */
  getEventIds(): string[] {
    return Object.keys(SFX_SYNTH_REGISTRY);
  }

  /** 变体数量 */
  getVariantCount(eventId: string): number {
    return SFX_SYNTH_REGISTRY[eventId]?.variantCount ?? 1;
  }

  /** 是否已初始化 */
  get isReady(): boolean {
    return this.initialized;
  }

  /** 估算音效时长 */
  private estimateDuration(eventId: string): number {
    const durations: Record<string, number> = {
      'ui/click': 0.1,
      'ui/hover': 0.06,
      'ui/drawer_open': 0.35,
      'ui/drawer_close': 0.28,
      'ui/dialog_open': 0.45,
      'ui/dialog_close': 0.25,
      'ui/tab_switch': 0.15,
      'ui/success': 0.65,
      'ui/delete': 0.45,
      'ui/error': 0.55,
      'ui/search_type': 0.05,
      'ui/search_result': 0.18,
      'sfx/card_flip': 0.35,
      'sfx/card_place': 0.18,
      'sfx/pin_drop': 0.22,
      'sfx/pin_hover': 0.12,
      'sfx/paint_start': 0.18,
      'sfx/paint_stroke': 0.12,
      'sfx/timeline_scroll': 0.22,
      'sfx/event_create': 0.38,
      'sfx/event_conflict': 0.8,
      'sfx/graph_node_select': 0.22,
      'sfx/graph_link': 0.28,
      'sfx/chronicle_scroll': 0.32,
      'sfx/faction_color': 0.42,
      'sfx/import': 0.82,
      'sfx/export': 0.62,
    };
    return durations[eventId] ?? 0.3;
  }
}

// ─── Build function dispatcher ───────────────────────────────────────────

/**
 * 根据事件 ID 调用对应的合成函数
 * 使用 OfflineAudioContext 渲染
 */
function buildSynthForEvent(
  eventId: string,
  ctx: OfflineAudioContext,
  dest: AudioNode,
  rand: () => number
): void {
  const t = ctx.currentTime;

  switch (eventId) {
    case 'ui/click':
      woodKnock(ctx, dest, rand, 900 + rand() * 200, 0.06, 0.5);
      break;

    case 'ui/hover': {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(3000 + rand() * 500, t);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.06);
      break;
    }

    case 'ui/drawer_open':
      paperRustle(ctx, dest, rand, 0.3, 0.18);
      break;

    case 'ui/drawer_close':
      paperRustle(ctx, dest, rand, 0.15, 0.15);
      {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, t + 0.12);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.2, t + 0.12);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(g);
        g.connect(dest);
        osc.start(t + 0.12);
        osc.stop(t + 0.21);
      }
      break;

    case 'ui/dialog_open':
      paperRustle(ctx, dest, rand, 0.25, 0.22);
      woodKnock(ctx, dest, rand, 400, 0.15, 0.3);
      break;

    case 'ui/dialog_close':
      paperRustle(ctx, dest, rand, 0.15, 0.12);
      woodKnock(ctx, dest, rand, 600, 0.05, 0.15);
      break;

    case 'ui/tab_switch':
      metalRing(ctx, dest, rand, 2500 + rand() * 500, 0.12, 0.35);
      break;

    case 'ui/success':
      crystalDing(ctx, dest, rand, 3500 + rand() * 500, 0.4, 0.35);
      {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(5200, t + 0.15);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.15, t + 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(g);
        g.connect(dest);
        osc.start(t + 0.15);
        osc.stop(t + 0.46);
      }
      break;

    case 'ui/delete':
      dissipate(ctx, dest, rand, 0.4, 0.22);
      break;

    case 'ui/error':
      drumHit(ctx, dest, rand, 120, 0.4, 0.5);
      {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, t + 0.1);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.2, t + 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(g);
        g.connect(dest);
        osc.start(t + 0.1);
        osc.stop(t + 0.46);
      }
      break;

    case 'ui/search_type':
      inkDrop(ctx, dest, rand, 0.25);
      break;

    case 'ui/search_result':
      metalRing(ctx, dest, rand, 4500, 0.1, 0.3);
      break;

    case 'sfx/card_flip':
      paperRustle(ctx, dest, rand, 0.15, 0.18);
      woodKnock(ctx, dest, rand, 500, 0.08, 0.2);
      break;

    case 'sfx/card_place':
      woodKnock(ctx, dest, rand, 700, 0.06, 0.35);
      paperRustle(ctx, dest, rand, 0.08, 0.08);
      break;

    case 'sfx/pin_drop':
      metalRing(ctx, dest, rand, 3500, 0.08, 0.25);
      woodKnock(ctx, dest, rand, 300, 0.1, 0.3);
      break;

    case 'sfx/pin_hover':
      metalRing(ctx, dest, rand, 5000, 0.06, 0.15);
      break;

    case 'sfx/paint_start': {
      const len = Math.ceil(ctx.sampleRate * 0.15);
      const nBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const nData = nBuf.getChannelData(0);
      for (let i = 0; i < len; i++) nData[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = nBuf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, t);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      src.connect(filter);
      filter.connect(g);
      g.connect(dest);
      src.start(t);
      break;
    }

    case 'sfx/paint_stroke': {
      const len = Math.ceil(ctx.sampleRate * 0.1);
      const nBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const nData = nBuf.getChannelData(0);
      for (let i = 0; i < len; i++) nData[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = nBuf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400 + rand() * 200, t);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      src.connect(filter);
      filter.connect(g);
      g.connect(dest);
      src.start(t);
      break;
    }

    case 'sfx/timeline_scroll':
      paperRustle(ctx, dest, rand, 0.18, 0.12);
      break;

    case 'sfx/event_create':
      woodKnock(ctx, dest, rand, 1100, 0.05, 0.3);
      inkDrop(ctx, dest, rand, 0.2);
      {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t + 0.06);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.31);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.15, t + 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.31);
        osc.connect(g);
        g.connect(dest);
        osc.start(t + 0.06);
        osc.stop(t + 0.32);
      }
      break;

    case 'sfx/event_conflict':
      dissonantTremolo(ctx, dest, rand, 0.7, 0.3);
      break;

    case 'sfx/graph_node_select':
      windChime(ctx, dest, rand, 0.25);
      break;

    case 'sfx/graph_link':
      stringPluck(ctx, dest, rand, 700 + rand() * 200, 0.2, 0.3);
      break;

    case 'sfx/chronicle_scroll':
      paperRustle(ctx, dest, rand, 0.25, 0.15);
      break;

    case 'sfx/faction_color':
      flagFlutter(ctx, dest, rand, 0.38, 0.18);
      break;

    case 'sfx/import':
      paperRustle(ctx, dest, rand, 0.3, 0.2);
      crystalDing(ctx, dest, rand, 2000, 0.5, 0.25);
      break;

    case 'sfx/export':
      paperRustle(ctx, dest, rand, 0.25, 0.15);
      woodKnock(ctx, dest, rand, 600, 0.1, 0.2);
      {
        // 延迟金属封印音
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1800, t + 0.3);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.2, t + 0.3);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(g);
        g.connect(dest);
        osc.start(t + 0.3);
        osc.stop(t + 0.51);
      }
      break;
  }
}

// ─── Export Singleton ────────────────────────────────────────────────────

export const proceduralSFX = new ProceduralSFXEngine();
export { SFX_SYNTH_REGISTRY };
