/**
 * AudioManager - 音频系统核心单例
 *
 * 职责：
 * - 管理 AudioContext 生命周期（用户手势激活）
 * - 构建 Bus 架构：Master → SFX / Music / Ambience
 * - 统一音量控制（通过 audioStore 驱动）
 * - SFX 播放：随机变体、voice stealing、防重复
 * - 页面可见性处理（切后台暂停音频）
 * - reduced-motion 偏好尊重
 *
 * 音效来源：ProceduralSFX 程序化合成（零外部文件依赖）
 * 音乐来源：ProceduralMusic 程序化合成 + MusicSystem 状态机
 *
 * 性能预算：
 * - ≤8 同时播放 voices
 * - ≤2ms DSP/帧
 * - ≤5MB 音频内存
 */
import { useAudioStore } from '../../store/audioStore';
import { musicSystem } from './MusicSystem';
import { proceduralMusic } from './ProceduralMusic';
import { ambienceSystem } from './AmbienceSystem';
import { proceduralAmbience } from './ProceduralAmbience';

// ─── Types ──────────────────────────────────────────────────────────────

export type MusicState = 'silence' | 'explore' | 'create' | 'epic' | 'conflict';
export type AmbienceScene = 'ambient' | 'map' | 'library' | 'candle' | 'hall' | 'writing';

export interface SFXConfig {
  /** 音高随机范围 ±n (0.05 = ±5%) */
  pitchRange: number;
  /** 音量随机范围 ±n (0.10 = ±10%) */
  volumeRange: number;
  /** 优先级 0=最高(UI), 1=交互, 2=环境 */
  priority: number;
  /** 变体数量（用于 buffer 查找范围） */
  variantCount?: number;
}

interface ActiveVoice {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  priority: number;
  startedAt: number;
  eventId: string;
}

// ─── Constants ──────────────────────────────────────────────────────────

const MAX_VOICES = 8;
const DEBOUNCE_MS = 100; // 同事件防重复间隔

// ─── AudioManager Singleton ─────────────────────────────────────────────

class AudioManagerInstance {
  // AudioContext（延迟初始化，需要用户手势）
  private ctx: AudioContext | null = null;
  private isResumed = false;

  // Bus 架构
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;

  // SFX 资源缓存
  private sfxBuffers = new Map<string, AudioBuffer>();
  private sfxConfigs = new Map<string, SFXConfig>();

  // 活跃 voices 管理
  private activeVoices: ActiveVoice[] = [];
  private lastPlayTime = new Map<string, number>(); // 防重复

  // 加载状态
  private sfxLoaded = false;
  private audioSystemReady = false; // SFX + Music + Ambience 全部初始化完成

  // 音乐/环境声状态（Phase 4/5 实现，这里只定义接口）
  private _musicState: MusicState = 'silence';
  private _ambienceScene: AmbienceScene = 'ambient';

  // 缓存 activate 前收到的最新状态，激活后回放
  private pendingMusicState: MusicState | null = null;
  private pendingAmbienceScene: AmbienceScene | null = null;

  // reduced-motion
  private readonly prefersReducedMotion: boolean;

  constructor() {
    this.prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 监听页面可见性
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.suspend();
        } else {
          this.resume();
        }
      });
    }

    // 监听 audioStore 变化 → 更新 Bus 音量
    this.subscribeToStore();
  }

  // ─── AudioContext 初始化（用户手势触发）────────────────────────

  /** 确保上下文已创建 */
  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.buildBusArchitecture();
    }
    return this.ctx;
  }

  /** 获取当前 AudioContext（供 ProceduralSFX 使用） */
  getContext(): AudioContext | null {
    return this.ctx;
  }

  /** 在用户手势中调用，激活 AudioContext */
  async activate(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    this.isResumed = true;

    // 初始化程序化 SFX 合成引擎
    // (由 SFXPlayer.initSFX 单独调用)

    // 初始化程序化音乐引擎
    if (!proceduralMusic.isReady) {
      try {
        await proceduralMusic.init(ctx);
      } catch (err) {
        console.warn('[Audio] ProceduralMusic init failed:', err);
      }
    }

    // 初始化音乐状态机
    if (this.musicGain) {
      musicSystem.init(ctx, this.musicGain);
    }

    // 初始化程序化环境声引擎
    if (!proceduralAmbience.isReady) {
      try {
        await proceduralAmbience.init(ctx);
      } catch (err) {
        console.warn('[Audio] ProceduralAmbience init failed:', err);
      }
    }

    // 初始化环境声系统
    if (this.ambienceGain) {
      ambienceSystem.init(ctx, this.ambienceGain);
    }

    // 标记音频系统就绪
    this.audioSystemReady = true;

    // 回放 activate 前收到的缓存状态
    if (this.pendingMusicState) {
      musicSystem.setState(this.pendingMusicState);
      this._musicState = this.pendingMusicState;
      this.pendingMusicState = null;
    }
    if (this.pendingAmbienceScene) {
      ambienceSystem.setScene(this.pendingAmbienceScene);
      this._ambienceScene = this.pendingAmbienceScene;
      this.pendingAmbienceScene = null;
    }
  }

  /** 检查是否已激活 */
  get isActive(): boolean {
    return this.isResumed && this.ctx !== null && this.ctx.state === 'running';
  }

  // ─── Bus 架构 ─────────────────────────────────────────────────────

  private buildBusArchitecture(): void {
    if (!this.ctx) return;

    // Master Bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);

    // SFX Bus
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);

    // Music Bus
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.masterGain);

    // Ambience Bus
    this.ambienceGain = this.ctx.createGain();
    this.ambienceGain.connect(this.masterGain);

    // 应用当前 store 设置
    this.applyVolumes();
  }

  private applyVolumes(): void {
    const store = useAudioStore.getState();
    this.masterGain?.gain.setTargetAtTime(
      store.isMuted ? 0 : store.masterVolume,
      this.ctx?.currentTime ?? 0,
      0.05
    );
    this.sfxGain?.gain.setTargetAtTime(store.sfxVolume, this.ctx?.currentTime ?? 0, 0.05);
    this.musicGain?.gain.setTargetAtTime(
      store.musicEnabled ? store.musicVolume : 0,
      this.ctx?.currentTime ?? 0,
      0.05
    );
    this.ambienceGain?.gain.setTargetAtTime(
      store.ambienceEnabled ? store.ambienceVolume : 0,
      this.ctx?.currentTime ?? 0,
      0.05
    );
  }

  private subscribeToStore(): void {
    useAudioStore.subscribe(() => {
      this.applyVolumes();
    });
  }

  // ─── SFX 资源注册 ────────────────────────────────────────────────

  /**
   * 注册 SFX 事件配置
   */
  registerSFX(eventId: string, config: SFXConfig): void {
    this.sfxConfigs.set(eventId, config);
  }

  /**
   * 批量注册 SFX
   */
  registerSFXBatch(configs: Record<string, SFXConfig>): void {
    Object.entries(configs).forEach(([id, cfg]) => {
      this.sfxConfigs.set(id, cfg);
    });
  }

  /**
   * 注入程序化合成的 AudioBuffer
   * 由 SFXPlayer.initSFX() 调用
   */
  injectSFXBuffer(eventId: string, variantIndex: number, buffer: AudioBuffer): void {
    const cacheKey = `${eventId}_${variantIndex}`;
    this.sfxBuffers.set(cacheKey, buffer);
  }

  /**
   * 标记 SFX 已加载完成
   */
  markSFXLoaded(): void {
    this.sfxLoaded = true;
  }

  /**
   * 预加载 SFX（兼容接口，程序化合成下由 initSFX 驱动）
   */
  async preloadSFX(): Promise<void> {
    // 程序化合成不需要 fetch，直接标记完成
    if (this.sfxLoaded) return;
    this.sfxLoaded = true;
  }

  // ─── SFX 播放 ────────────────────────────────────────────────────

  /**
   * 播放 one-shot 音效
   * 支持随机变体、防重复、voice stealing
   */
  playSFX(eventId: string): void {
    if (!this.isActive) return;

    // reduced-motion: 降低 SFX 触发频率
    if (this.prefersReducedMotion) {
      const lastTime = this.lastPlayTime.get(eventId) ?? 0;
      if (Date.now() - lastTime < 500) return;
    }

    // 同事件防重复
    const lastTime = this.lastPlayTime.get(eventId) ?? 0;
    if (Date.now() - lastTime < DEBOUNCE_MS) return;

    const config = this.sfxConfigs.get(eventId);
    if (!config) {
      console.warn(`[Audio] Unknown SFX event: ${eventId}`);
      return;
    }

    // 查找已注入的 buffer（根据 variantCount 范围）
    const variantCount = config.variantCount ?? 1;
    const availableBuffers: AudioBuffer[] = [];
    for (let i = 0; i < variantCount; i++) {
      const buf = this.sfxBuffers.get(`${eventId}_${i}`);
      if (buf) availableBuffers.push(buf);
    }

    if (availableBuffers.length === 0) return;

    // 随机选择变体
    const chosen = availableBuffers[Math.floor(Math.random() * availableBuffers.length)];

    // Voice stealing: 超过上限时抢占低优先级
    if (this.activeVoices.length >= MAX_VOICES) {
      this.stealVoice(config.priority);
    }

    // 创建播放节点
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();

    source.buffer = chosen;

    // 随机音高偏移
    const pitchOffset = 1 + (Math.random() * 2 - 1) * config.pitchRange;
    source.playbackRate.value = pitchOffset;

    // 随机音量偏移
    const volumeOffset = 1 + (Math.random() * 2 - 1) * config.volumeRange;
    gainNode.gain.value = Math.max(0, Math.min(1, volumeOffset));

    // 连接到 SFX Bus
    source.connect(gainNode);
    gainNode.connect(this.sfxGain!);

    // 跟踪 voice
    const voice: ActiveVoice = {
      source,
      gainNode,
      priority: config.priority,
      startedAt: ctx.currentTime,
      eventId,
    };
    this.activeVoices.push(voice);

    // 播放结束后清理
    source.onended = () => {
      const idx = this.activeVoices.indexOf(voice);
      if (idx >= 0) this.activeVoices.splice(idx, 1);
      source.disconnect();
      gainNode.disconnect();
    };

    source.start(0);
    this.lastPlayTime.set(eventId, Date.now());
  }

  /**
   * Voice stealing: 抢占最低优先级的 voice
   */
  private stealVoice(incomingPriority: number): void {
    let victimIdx = -1;
    let worstPriority = -1;
    let earliestTime = Infinity;

    for (let i = 0; i < this.activeVoices.length; i++) {
      const v = this.activeVoices[i];
      if (v.priority > incomingPriority) {
        if (v.priority > worstPriority || (v.priority === worstPriority && v.startedAt < earliestTime)) {
          worstPriority = v.priority;
          earliestTime = v.startedAt;
          victimIdx = i;
        }
      }
    }

    // 如果没找到更低优先级的，抢占同优先级中最老的
    if (victimIdx === -1) {
      for (let i = 0; i < this.activeVoices.length; i++) {
        const v = this.activeVoices[i];
        if (v.startedAt < earliestTime) {
          earliestTime = v.startedAt;
          victimIdx = i;
        }
      }
    }

    if (victimIdx >= 0) {
      const victim = this.activeVoices[victimIdx];
      try {
        victim.gainNode.gain.setTargetAtTime(0, this.ctx?.currentTime ?? 0, 0.02);
        victim.source.stop((this.ctx?.currentTime ?? 0) + 0.05);
      } catch {
        // already stopped
      }
      this.activeVoices.splice(victimIdx, 1);
    }
  }

  // ─── 音乐状态接口 ────────────────────────────────────────────────

  get musicState(): MusicState {
    return this._musicState;
  }

  setMusicState(state: MusicState): void {
    if (this._musicState === state && this.audioSystemReady) return;
    this._musicState = state;

    if (!this.audioSystemReady) {
      // 系统未就绪，缓存状态，activate 完成后回放
      this.pendingMusicState = state;
      return;
    }

    musicSystem.setState(state);
  }

  // ─── 环境声接口 ────────────────────────────────────────────────

  get ambienceScene(): AmbienceScene {
    return this._ambienceScene;
  }

  setAmbienceScene(scene: AmbienceScene): void {
    if (this._ambienceScene === scene && this.audioSystemReady) return;
    this._ambienceScene = scene;

    if (!this.audioSystemReady) {
      // 系统未就绪，缓存状态，activate 完成后回放
      this.pendingAmbienceScene = scene;
      return;
    }

    ambienceSystem.setScene(scene);
  }

  // ─── 冲突音效接口 ────────────────────────────────────────────────

  triggerConflict(): void {
    if (!this.audioSystemReady) return;
    this.setMusicState('conflict');
  }

  clearConflict(): void {
    if (!this.audioSystemReady) return;
    if (this._musicState === 'conflict') {
      this._musicState = 'explore';
      musicSystem.clearConflict();
    }
  }

  // ─── 生命周期 ─────────────────────────────────────────────────────

  private suspend(): void {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }
  }

  private resume(): void {
    if (this.ctx && this.ctx.state === 'suspended' && this.isResumed) {
      this.ctx.resume();
    }
  }

  /** 清理所有资源（组件卸载时） */
  dispose(): void {
    for (const voice of this.activeVoices) {
      try {
        voice.source.stop();
        voice.source.disconnect();
        voice.gainNode.disconnect();
      } catch {
        // already stopped
      }
    }
    this.activeVoices = [];

    this.sfxBuffers.clear();
    this.sfxLoaded = false;

    // 清理音乐系统
    musicSystem.dispose();

    // 清理环境声系统
    ambienceSystem.dispose();

    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.isResumed = false;
      this.masterGain = null;
      this.sfxGain = null;
      this.musicGain = null;
      this.ambienceGain = null;
    }
  }

  // ─── 诊断 ─────────────────────────────────────────────────────────

  /** 获取活跃 voice 数量（调试用） */
  get voiceCount(): number {
    return this.activeVoices.length;
  }

  /** 获取已加载 SFX 数量（调试用） */
  get loadedSFXCount(): number {
    return this.sfxBuffers.size;
  }
}

// ─── 导出单例 ────────────────────────────────────────────────────────

export const audioManager = new AudioManagerInstance();
