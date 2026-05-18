/**
 * MusicSystem - 自适应音乐状态机 + crossfade 引擎
 *
 * 职责：
 * - 5 状态管理：silence / explore / create / epic / conflict
 * - 平滑 crossfade 过渡（基于 GainNode 线性渐变）
 * - 循环播放（AudioBufferSourceNode loop 模式）
 * - 冲突 stinger 叠加播放
 * - 与 AudioManager.musicGain 总线连接
 *
 * 状态转换规则（来自设计文档）：
 *   silence → explore/create : Fade In (1.5-2s)
 *   explore ↔ create         : Crossfade (1.5s)
 *   explore ↔ epic           : Crossfade (2s)
 *   * → conflict              : Stinger + 叠加 (0.5s)
 *   conflict → explore        : Crossfade (1.5s, 延迟 3s)
 *   * → silence               : Fade Out (1s)
 *
 * 性能：
 *   - 最多同时 2 个 AudioBufferSourceNode（crossfade 期间）
 *   - crossfade CPU ≤ 0.5ms（仅 GainNode ramp）
 *   - 循环音乐不重复加载，复用 AudioBuffer
 */

import type { MusicState } from './AudioManager';
import type { MusicTrack } from './ProceduralMusic';
import { proceduralMusic } from './ProceduralMusic';

// ─── 过渡时间配置（秒）──────────────────────────────────────────────

const TRANSITION_TIMES: Record<string, number> = {
  'silence→explore': 2.0,
  'silence→create': 1.5,
  'silence→epic': 2.0,
  'silence→conflict': 0.5,
  'explore→create': 1.5,
  'explore→epic': 2.0,
  'explore→conflict': 0.5,
  'create→explore': 1.5,
  'create→epic': 2.0,
  'create→conflict': 0.3,
  'epic→explore': 2.0,
  'epic→create': 1.5,
  'epic→conflict': 0.5,
  'conflict→explore': 1.5,
  'conflict→create': 1.5,
  'conflict→epic': 2.0,
  '*→silence': 1.0,
};

function getTransitionTime(from: MusicState, to: MusicState): number {
  const key = `${from}→${to}`;
  return TRANSITION_TIMES[key] ?? TRANSITION_TIMES[`*→silence`] ?? 1.5;
}

// ─── 状态到轨道映射 ──────────────────────────────────────────────

function stateToTrack(state: MusicState): MusicTrack | null {
  switch (state) {
    case 'explore': return 'explore';
    case 'create': return 'create';
    case 'epic': return 'epic';
    case 'conflict': return 'conflict';
    case 'silence': return null;
  }
}

// ─── 活跃音轨 ──────────────────────────────────────────────────

interface ActiveTrack {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  trackName: string;
}

// ─── MusicSystem ──────────────────────────────────────────────────

class MusicSystemInstance {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;

  private currentState: MusicState = 'silence';
  private currentTrack: ActiveTrack | null = null;
  private fadingOutTrack: ActiveTrack | null = null;

  // 冲突 stinger 播放
  private conflictStingerSource: AudioBufferSourceNode | null = null;

  // 冲突恢复延迟定时器
  private conflictClearTimer: ReturnType<typeof setTimeout> | null = null;

  // 上一个非冲突状态（用于冲突恢复）
  private preConflictState: MusicState = 'explore';

  private initialized = false;

  /**
   * 初始化音乐系统，传入 AudioContext 和 Music Bus GainNode
   */
  init(ctx: AudioContext, musicGainNode: GainNode): void {
    if (this.initialized) return;
    this.ctx = ctx;
    this.musicGain = musicGainNode;
    this.initialized = true;
    console.log('[MusicSystem] Initialized');
  }

  /**
   * 切换音乐状态（核心方法）
   */
  setState(newState: MusicState): void {
    if (!this.ctx || !this.musicGain) return;
    if (this.currentState === newState) return;

    const oldState = this.currentState;

    // 清除冲突恢复定时器
    if (this.conflictClearTimer) {
      clearTimeout(this.conflictClearTimer);
      this.conflictClearTimer = null;
    }

    // 记录冲突前状态
    if (oldState !== 'conflict' && newState !== 'conflict') {
      this.preConflictState = newState;
    } else if (oldState !== 'conflict' && newState === 'conflict') {
      this.preConflictState = oldState;
    }

    // 如果切到 silence
    if (newState === 'silence') {
      this.fadeOutCurrent(getTransitionTime(oldState, 'silence'));
      this.currentState = 'silence';
      return;
    }

    // 如果从 silence 切入
    if (oldState === 'silence') {
      this.fadeInNew(newState, getTransitionTime('silence', newState));
      this.currentState = newState;
      return;
    }

    // 如果切到冲突：叠加 stinger
    if (newState === 'conflict') {
      this.playConflictStinger();
      this.crossfadeTo(newState, getTransitionTime(oldState, 'conflict'));
      this.currentState = newState;
      return;
    }

    // 普通 crossfade
    this.crossfadeTo(newState, getTransitionTime(oldState, newState));
    this.currentState = newState;
  }

  /**
   * 清除冲突状态（延迟 3 秒后恢复）
   */
  clearConflict(): void {
    if (this.currentState !== 'conflict') return;

    // 延迟 3 秒后恢复到冲突前状态
    this.conflictClearTimer = setTimeout(() => {
      if (this.currentState === 'conflict') {
        this.setState(this.preConflictState);
      }
    }, 3000);
  }

  /**
   * 获取当前状态
   */
  getState(): MusicState {
    return this.currentState;
  }

  // ─── 内部方法 ──────────────────────────────────────────────────

  private fadeInNew(state: MusicState, fadeTime: number): void {
    const track = stateToTrack(state);
    if (!track) return;

    const buffer = proceduralMusic.getBuffer(track);
    if (!buffer) {
      console.warn(`[MusicSystem] No buffer for track: ${track}`);
      return;
    }

    this.currentTrack = this.createPlayingTrack(buffer, track, 0, fadeTime);
  }

  private fadeOutCurrent(fadeTime: number): void {
    if (!this.currentTrack || !this.ctx) return;

    const track = this.currentTrack;
    const now = this.ctx.currentTime;

    track.gainNode.gain.cancelScheduledValues(now);
    track.gainNode.gain.setValueAtTime(track.gainNode.gain.value, now);
    track.gainNode.gain.linearRampToValueAtTime(0, now + fadeTime);

    // 渐出完成后停止
    try {
      track.source.stop(now + fadeTime + 0.1);
    } catch {
      // already stopped
    }

    this.currentTrack = null;
  }

  private crossfadeTo(newState: MusicState, fadeTime: number): void {
    const newTrack = stateToTrack(newState);
    if (!newTrack) return;

    const buffer = proceduralMusic.getBuffer(newTrack);
    if (!buffer) {
      console.warn(`[MusicSystem] No buffer for track: ${newTrack}`);
      return;
    }

    // 新轨道淡入
    const newPlaying = this.createPlayingTrack(buffer, newTrack, 0, fadeTime);

    // 旧轨道淡出
    if (this.currentTrack && this.ctx) {
      const old = this.currentTrack;
      const now = this.ctx.currentTime;

      old.gainNode.gain.cancelScheduledValues(now);
      old.gainNode.gain.setValueAtTime(old.gainNode.gain.value, now);
      old.gainNode.gain.linearRampToValueAtTime(0, now + fadeTime);

      try {
        old.source.stop(now + fadeTime + 0.1);
      } catch {
        // already stopped
      }
    }

    this.currentTrack = newPlaying;
  }

  private playConflictStinger(): void {
    if (!this.ctx || !this.musicGain) return;

    const buffer = proceduralMusic.getBuffer('conflict_stinger');
    if (!buffer) return;

    // 停止之前的 stinger
    if (this.conflictStingerSource) {
      try { this.conflictStingerSource.stop(); } catch { /* noop */ }
    }

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    source.loop = false;
    gain.gain.value = 0.4; // stinger 比较突出

    source.connect(gain);
    gain.connect(this.musicGain);

    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      if (this.conflictStingerSource === source) {
        this.conflictStingerSource = null;
      }
    };

    source.start(0);
    this.conflictStingerSource = source;
  }

  private createPlayingTrack(
    buffer: AudioBuffer, trackName: string, startVolume: number, fadeTime: number
  ): ActiveTrack {
    const ctx = this.ctx!;
    const gainNode = ctx.createGain();
    const source = ctx.createBufferSource();

    source.buffer = buffer;
    source.loop = true; // 循环播放
    gainNode.gain.value = startVolume;

    source.connect(gainNode);
    gainNode.connect(this.musicGain!);

    // 淡入
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(startVolume, now);
    gainNode.gain.linearRampToValueAtTime(1.0, now + fadeTime);

    source.start(0);

    source.onended = () => {
      source.disconnect();
      gainNode.disconnect();
    };

    return { source, gainNode, trackName };
  }

  /**
   * 释放所有资源
   */
  dispose(): void {
    if (this.conflictClearTimer) {
      clearTimeout(this.conflictClearTimer);
      this.conflictClearTimer = null;
    }

    if (this.currentTrack) {
      try { this.currentTrack.source.stop(); } catch { /* noop */ }
      this.currentTrack = null;
    }

    if (this.fadingOutTrack) {
      try { this.fadingOutTrack.source.stop(); } catch { /* noop */ }
      this.fadingOutTrack = null;
    }

    if (this.conflictStingerSource) {
      try { this.conflictStingerSource.stop(); } catch { /* noop */ }
      this.conflictStingerSource = null;
    }

    this.ctx = null;
    this.musicGain = null;
    this.initialized = false;
    this.currentState = 'silence';
  }
}

// ─── 导出单例 ──────────────────────────────────────────────────────

export const musicSystem = new MusicSystemInstance();
