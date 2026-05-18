/**
 * ProceduralMusic - 程序化背景音乐合成引擎
 *
 * 用 Web Audio API 实时生成循环背景音乐，零外部文件依赖。
 * 四种音乐状态 + 一个冲突 stinger：
 *
 *   explore — 钢琴 + 大提琴长音，60 BPM，宁静开阔
 *   create  — 古典吉他 + 竹笛，75 BPM，温暖专注
 *   epic    — 管弦乐 + 定音鼓，80 BPM，宏大史诗
 *   conflict — 紧张弦乐颤音 + 低音鼓点，90 BPM
 *
 * 合成策略：
 *   - 使用 OscillatorNode + BiquadFilterNode 模拟乐器音色
 *   - 五声音阶（宫商角徵羽）保证古风调性
 *   - 简单的 MIDI 序列器模式：note-on / note-off 事件队列
 *   - OfflineAudioContext 离线渲染为 AudioBuffer
 *
 * 声音身份：古朴 · 温暖 · 神秘
 */

// ─── 音阶定义（五声音阶）──────────────────────────────────────────────

/** MIDI 音符号 → 频率 */
function midiToFreq(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

// C 大调五声音阶音阶表（多个八度）
const PENTATONIC_SCALE = [
  // C3 D3 E3 G3 A3
  48, 50, 52, 55, 57,
  // C4 D4 E4 G4 A4
  60, 62, 64, 67, 69,
  // C5 D5 E5 G5 A5
  72, 74, 76, 79, 81,
  // C6
  84,
];

// ─── 确定性随机数生成器 ──────────────────────────────────────────────

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

// ─── 音符序列生成 ──────────────────────────────────────────────────

interface NoteEvent {
  /** MIDI note number */
  note: number;
  /** 开始时间（秒） */
  start: number;
  /** 持续时间（秒） */
  duration: number;
  /** 音量 0-1 */
  velocity: number;
}

type PatternGenerator = (rng: () => number, duration: number) => NoteEvent[];

/** 随机选取五声音阶中的音符 */
function pickNote(rng: () => number, octaveRange: [number, number] = [60, 84]): number {
  const filtered = PENTATONIC_SCALE.filter(n => n >= octaveRange[0] && n <= octaveRange[1]);
  return filtered[Math.floor(rng() * filtered.length)];
}

// ─── Explore 音乐模式 ──────────────────────────────────────────────

function generateExplorePattern(rng: () => number, totalDuration: number): NoteEvent[] {
  const events: NoteEvent[] = [];
  const beatDuration = 60 / 60; // 60 BPM = 1 beat per second
  const numBeats = Math.floor(totalDuration / beatDuration);

  // 钢琴旋律：每 2-4 拍一个音符，带长延音
  let t = 0;
  for (let i = 0; i < numBeats; i++) {
    if (rng() < 0.35) { // ~35% 概率弹一个音
      const note = pickNote(rng, [60, 79]);
      const dur = (2 + Math.floor(rng() * 4)) * beatDuration;
      events.push({ note, start: t, duration: dur, velocity: 0.15 + rng() * 0.1 });
    }
    t += beatDuration;
  }

  // 大提琴长音垫底：每 8 拍换一个低音
  for (let t2 = 0; t2 < totalDuration; t2 += 8 * beatDuration) {
    const note = pickNote(rng, [36, 48]);
    events.push({
      note,
      start: t2,
      duration: Math.min(8 * beatDuration, totalDuration - t2),
      velocity: 0.08 + rng() * 0.04,
    });
  }

  return events;
}

// ─── Create 音乐模式 ──────────────────────────────────────────────

function generateCreatePattern(rng: () => number, totalDuration: number): NoteEvent[] {
  const events: NoteEvent[] = [];
  const beatDuration = 60 / 75; // 75 BPM
  const numBeats = Math.floor(totalDuration / beatDuration);

  // 古典吉他分解和弦：每拍一个音
  const chordShapes = [
    [48, 52, 55, 60], // C
    [45, 52, 57, 60], // Am (五声音阶近似)
    [43, 50, 55, 59], // G (微调)
    [48, 53, 57, 60], // F (五声音阶近似)
  ];

  let chordIdx = 0;
  for (let i = 0; i < numBeats; i++) {
    // 每 4 拍换和弦
    if (i % 4 === 0 && i > 0) {
      chordIdx = (chordIdx + 1) % chordShapes.length;
    }
    const chord = chordShapes[chordIdx];
    const noteIdx = i % chord.length;
    events.push({
      note: chord[noteIdx],
      start: i * beatDuration,
      duration: beatDuration * 0.8,
      velocity: 0.12 + rng() * 0.06,
    });
  }

  // 竹笛点缀：偶尔加一个高音
  for (let t = 0; t < totalDuration; t += beatDuration) {
    if (rng() < 0.08) {
      const note = pickNote(rng, [72, 84]);
      events.push({
        note,
        start: t,
        duration: beatDuration * 2,
        velocity: 0.06 + rng() * 0.04,
      });
    }
  }

  return events;
}

// ─── Epic 音乐模式 ──────────────────────────────────────────────

function generateEpicPattern(rng: () => number, totalDuration: number): NoteEvent[] {
  const events: NoteEvent[] = [];
  const beatDuration = 60 / 80; // 80 BPM
  const numBeats = Math.floor(totalDuration / beatDuration);

  // 弦乐长音垫底（多层）
  for (let t = 0; t < totalDuration; t += 4 * beatDuration) {
    // 低音弦乐
    events.push({
      note: pickNote(rng, [36, 48]),
      start: t,
      duration: Math.min(4 * beatDuration, totalDuration - t),
      velocity: 0.12 + rng() * 0.05,
    });
    // 中音弦乐
    if (rng() < 0.6) {
      events.push({
        note: pickNote(rng, [55, 67]),
        start: t,
        duration: Math.min(4 * beatDuration, totalDuration - t),
        velocity: 0.08 + rng() * 0.04,
      });
    }
  }

  // 定音鼓节奏：每 2 拍敲一下
  for (let i = 0; i < numBeats; i += 2) {
    if (rng() < 0.6) {
      events.push({
        note: 36, // 低音鼓
        start: i * beatDuration,
        duration: 0.3,
        velocity: 0.2 + rng() * 0.1,
      });
    }
  }

  // 管乐旋律线：每 4 拍一个长音
  for (let t = 0; t < totalDuration; t += 4 * beatDuration) {
    if (rng() < 0.5) {
      events.push({
        note: pickNote(rng, [60, 76]),
        start: t,
        duration: 3 * beatDuration,
        velocity: 0.1 + rng() * 0.05,
      });
    }
  }

  return events;
}

// ─── Conflict Stinger（短促警示音，不循环）──────────────────────────

function generateConflictStinger(rng: () => number, totalDuration: number): NoteEvent[] {
  const events: NoteEvent[] = [];
  const beatDuration = 60 / 90; // 90 BPM

  // 紧张弦乐颤音
  for (let i = 0; i < 8; i++) {
    events.push({
      note: 55 + Math.floor(rng() * 12), // 紧张的不和谐区间
      start: i * beatDuration * 0.5,
      duration: beatDuration * 0.4,
      velocity: 0.15 + rng() * 0.1,
    });
  }

  // 低音鼓点
  for (let i = 0; i < 4; i++) {
    events.push({
      note: 30 + Math.floor(rng() * 6),
      start: i * beatDuration,
      duration: 0.2,
      velocity: 0.25 + rng() * 0.1,
    });
  }

  return events;
}

// ─── 离线渲染引擎 ──────────────────────────────────────────────────

type MusicTrack = 'explore' | 'create' | 'epic' | 'conflict' | 'conflict_stinger';

const TRACK_GENERATORS: Record<MusicTrack, PatternGenerator> = {
  explore: generateExplorePattern,
  create: generateCreatePattern,
  epic: generateEpicPattern,
  conflict: generateConflictStinger,
  conflict_stinger: generateConflictStinger,
};

const TRACK_CONFIG: Record<MusicTrack, { durationSec: number; bpm: number; seed: number }> = {
  explore:          { durationSec: 32, bpm: 60, seed: 42 },
  create:           { durationSec: 32, bpm: 75, seed: 137 },
  epic:             { durationSec: 32, bpm: 80, seed: 256 },
  conflict:         { durationSec: 16, bpm: 90, seed: 999 },
  conflict_stinger: { durationSec: 2,  bpm: 90, seed: 777 },
};

class ProceduralMusicEngine {
  private buffers = new Map<string, AudioBuffer>();
  private _ready = false;

  get isReady(): boolean {
    return this._ready;
  }

  /**
   * 在给定的 AudioContext 中初始化，离线渲染所有音乐轨道
   */
  async init(ctx: AudioContext): Promise<void> {
    const tracks: MusicTrack[] = ['explore', 'create', 'epic', 'conflict', 'conflict_stinger'];

    await Promise.all(tracks.map(track => this.renderTrack(ctx, track)));

    this._ready = true;
    console.log(`[ProceduralMusic] ${tracks.length} tracks rendered, ${this.buffers.size} buffers`);
  }

  /**
   * 获取指定轨道的 AudioBuffer
   */
  getBuffer(track: MusicTrack): AudioBuffer | undefined {
    // 返回任何可用变体
    for (const [key, buf] of this.buffers) {
      if (key.startsWith(track)) return buf;
    }
    return undefined;
  }

  private async renderTrack(ctx: AudioContext, track: MusicTrack): Promise<void> {
    const config = TRACK_CONFIG[track];
    const rng = mulberry32(config.seed);
    const sampleRate = ctx.sampleRate;
    const duration = config.durationSec;
    const length = Math.ceil(sampleRate * duration);

    // 生成音符序列
    const notes = TRACK_GENERATORS[track](rng, duration);

    // 离线渲染
    const offline = new OfflineAudioContext(2, length, sampleRate);

    // 为每个音符创建合成节点
    for (const note of notes) {
      await this.renderNote(offline, note, track);
    }

    try {
      const buffer = await offline.startRendering();
      this.buffers.set(track, buffer);
    } catch (err) {
      console.warn(`[ProceduralMusic] Failed to render ${track}:`, err);
    }
  }

  private async renderNote(ctx: OfflineAudioContext, event: NoteEvent, track: MusicTrack): Promise<void> {
    const freq = midiToFreq(event.note);
    const startTime = Math.max(0, event.start);
    const endTime = startTime + event.duration;

    // 根据音域选择合成策略
    if (event.note < 48) {
      // 低音：sawtooth + low-pass（模拟大提琴/低音）
      this.renderBass(ctx, freq, startTime, endTime, event.velocity, track);
    } else if (event.note < 60) {
      // 中音：triangle + band-pass（模拟中提琴/吉他）
      this.renderMid(ctx, freq, startTime, endTime, event.velocity, track);
    } else if (event.note < 72) {
      // 中高音：sine + light detune（模拟笛/管）
      this.renderTreble(ctx, freq, startTime, endTime, event.velocity, track);
    } else {
      // 高音：sine + 微弱 overtones（点缀音）
      this.renderHigh(ctx, freq, startTime, endTime, event.velocity, track);
    }
  }

  private renderBass(
    ctx: OfflineAudioContext, freq: number, start: number, end: number, vel: number, track: MusicTrack
  ): void {
    const duration = end - start;
    if (duration <= 0.01) return; // 太短，跳过

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    // 低通滤波器温暖化
    filter.type = 'lowpass';
    filter.frequency.value = track === 'epic' ? 600 : 400;
    filter.Q.value = 0.7;

    // ADSR 包络 — 保证时间单调递增
    const attack = Math.min(0.15, duration * 0.2);
    const release = Math.min(0.3, duration * 0.3);
    const sustainEnd = Math.max(start + attack + 0.01, end - release);

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vel * 0.3, start + attack);
    gain.gain.setValueAtTime(vel * 0.3, sustainEnd);
    gain.gain.linearRampToValueAtTime(0, end);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(end + 0.01);
  }

  private renderMid(
    ctx: OfflineAudioContext, freq: number, start: number, end: number, vel: number, track: MusicTrack
  ): void {
    const duration = end - start;
    if (duration <= 0.01) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = track === 'create' ? 'triangle' : 'sine';
    osc.frequency.value = freq;

    filter.type = 'bandpass';
    filter.frequency.value = freq * 2;
    filter.Q.value = 0.5;

    const attack = Math.min(0.05, duration * 0.15);
    const release = Math.min(0.2, duration * 0.25);
    const sustainEnd = Math.max(start + attack + 0.01, end - release);

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vel * 0.25, start + attack);
    gain.gain.setValueAtTime(vel * 0.25, sustainEnd);
    gain.gain.linearRampToValueAtTime(0, end);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(end + 0.01);
  }

  private renderTreble(
    ctx: OfflineAudioContext, freq: number, start: number, end: number, vel: number, _track: MusicTrack
  ): void {
    const duration = end - start;
    if (duration <= 0.01) return;

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    // 轻微 detune 模拟自然音色
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc2.type = 'sine';
    osc2.frequency.value = freq * 1.003; // 微调

    const attack = Math.min(0.03, duration * 0.1);
    const release = Math.min(0.25, duration * 0.3);
    const sustainEnd = Math.max(start + attack + 0.01, end - release);

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vel * 0.2, start + attack);
    gain.gain.setValueAtTime(vel * 0.2, sustainEnd);
    gain.gain.linearRampToValueAtTime(0, end);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(end + 0.01);
    osc2.start(start);
    osc2.stop(end + 0.01);
  }

  private renderHigh(
    ctx: OfflineAudioContext, freq: number, start: number, end: number, vel: number, _track: MusicTrack
  ): void {
    const duration = end - start;
    if (duration <= 0.01) return; // 太短，跳过

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    // ADSR 包络 — 保证时间单调递增
    const attack = Math.min(0.02, duration * 0.1);
    const release = Math.min(0.15, duration * 0.4);
    const sustainEnd = Math.max(start + attack + 0.01, end - release);

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vel * 0.12, start + attack);
    gain.gain.setValueAtTime(vel * 0.12, sustainEnd);
    gain.gain.linearRampToValueAtTime(0, end);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(end + 0.01);
  }
}

// ─── 导出单例 ──────────────────────────────────────────────────────

export const proceduralMusic = new ProceduralMusicEngine();
export type { MusicTrack };
