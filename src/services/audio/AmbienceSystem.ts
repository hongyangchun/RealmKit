/**
 * AmbienceSystem - 环境声场管理器
 *
 * 职责：
 * - 按页面/场景切换环境声
 * - 平滑 crossfade 过渡（1.5-2s）
 * - 循环播放（loop 模式）
 * - 与 AudioManager.ambienceGain 总线连接
 *
 * 场景映射（来自设计文档）：
 *   ambient → wind_leaves（微风+树叶）
 *   map     → wind_leaves（户外）
 *   library → library（翻书声）
 *   candle  → fire_candle（烛火噼啪）
 *   hall    → hall_echo（大厅回响）
 *   writing → writing（书写声）
 *
 * 性能：
 *   - 最多 2 个 AudioBufferSourceNode（crossfade 期间）
 *   - 环境声音量较低（5-20%），不干扰 UI 和音乐
 */

import type { AmbienceScene } from './AudioManager';
import { proceduralAmbience, SCENE_TRACK_MAP, type AmbienceTrack } from './ProceduralAmbience';

const CROSSFADE_TIME = 1.5; // 秒

interface ActiveAmbience {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  trackName: string;
}

class AmbienceSystemInstance {
  private ctx: AudioContext | null = null;
  private ambienceGain: GainNode | null = null;

  private currentScene: AmbienceScene = 'ambient';
  private currentTrack: ActiveAmbience | null = null;

  private initialized = false;

  /**
   * 初始化环境声系统
   */
  init(ctx: AudioContext, ambienceGainNode: GainNode): void {
    if (this.initialized) return;
    this.ctx = ctx;
    this.ambienceGain = ambienceGainNode;
    this.initialized = true;
    console.log('[AmbienceSystem] Initialized');
  }

  /**
   * 切换环境声场景
   */
  setScene(scene: AmbienceScene): void {
    if (!this.ctx || !this.ambienceGain) return;
    if (this.currentScene === scene) return;

    const newTrack = SCENE_TRACK_MAP[scene];
    if (!newTrack) {
      // 无对应轨道，淡出当前
      this.fadeOutCurrent();
      this.currentScene = scene;
      return;
    }

    // 如果有当前轨道，crossfade
    if (this.currentTrack) {
      this.crossfadeTo(newTrack);
    } else {
      this.fadeIn(newTrack);
    }

    this.currentScene = scene;
  }

  /**
   * 获取当前场景
   */
  getScene(): AmbienceScene {
    return this.currentScene;
  }

  // ─── 内部方法 ──────────────────────────────────────────────────

  private fadeIn(track: AmbienceTrack): void {
    const buffer = proceduralAmbience.getBuffer(track);
    if (!buffer) {
      console.warn(`[AmbienceSystem] No buffer for track: ${track}`);
      return;
    }

    this.currentTrack = this.createLoopingTrack(buffer, track, CROSSFADE_TIME);
  }

  private fadeOutCurrent(): void {
    if (!this.currentTrack || !this.ctx) return;

    const track = this.currentTrack;
    const now = this.ctx.currentTime;

    track.gainNode.gain.cancelScheduledValues(now);
    track.gainNode.gain.setValueAtTime(track.gainNode.gain.value, now);
    track.gainNode.gain.linearRampToValueAtTime(0, now + CROSSFADE_TIME);

    try {
      track.source.stop(now + CROSSFADE_TIME + 0.1);
    } catch {
      // already stopped
    }

    this.currentTrack = null;
  }

  private crossfadeTo(newTrackName: AmbienceTrack): void {
    const buffer = proceduralAmbience.getBuffer(newTrackName);
    if (!buffer) {
      console.warn(`[AmbienceSystem] No buffer for track: ${newTrackName}`);
      return;
    }

    // 新轨道淡入
    const newPlaying = this.createLoopingTrack(buffer, newTrackName, CROSSFADE_TIME);

    // 旧轨道淡出
    if (this.currentTrack && this.ctx) {
      const old = this.currentTrack;
      const now = this.ctx.currentTime;

      old.gainNode.gain.cancelScheduledValues(now);
      old.gainNode.gain.setValueAtTime(old.gainNode.gain.value, now);
      old.gainNode.gain.linearRampToValueAtTime(0, now + CROSSFADE_TIME);

      try {
        old.source.stop(now + CROSSFADE_TIME + 0.1);
      } catch {
        // already stopped
      }
    }

    this.currentTrack = newPlaying;
  }

  private createLoopingTrack(
    buffer: AudioBuffer, trackName: string, fadeTime: number
  ): ActiveAmbience {
    const ctx = this.ctx!;
    const gainNode = ctx.createGain();
    const source = ctx.createBufferSource();

    source.buffer = buffer;
    source.loop = true;
    gainNode.gain.value = 0;

    source.connect(gainNode);
    gainNode.connect(this.ambienceGain!);

    // 淡入
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
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
    if (this.currentTrack) {
      try { this.currentTrack.source.stop(); } catch { /* noop */ }
      this.currentTrack = null;
    }

    this.ctx = null;
    this.ambienceGain = null;
    this.initialized = false;
    this.currentScene = 'ambient';
  }
}

// ─── 导出单例 ──────────────────────────────────────────────────

export const ambienceSystem = new AmbienceSystemInstance();
