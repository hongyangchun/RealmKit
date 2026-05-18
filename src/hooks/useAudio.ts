/**
 * useAudio - 全局音频 Hook
 *
 * 在 AppShell 层级使用一次（且仅一次）
 *
 * 职责：
 * - 监听路由变化 → 切换音乐状态 + 环境声场景
 * - 监听 worldStore.conflicts → 触发/清除冲突音效
 * - 首次用户交互时激活 AudioContext
 * - 初始化 SFX 系统
 */
import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useWorldStore } from '../store/worldStore';
import { audioManager } from '../services/audio/AudioManager';
import { initSFX } from '../services/audio/SFXPlayer';

/**
 * 全局音频 Hook
 * 在 AppShell 中调用：useAudio()
 */
export function useAudio(): void {
  const location = useLocation();
  const conflicts = useWorldStore((s) => s.conflicts);
  const audioInitialized = useRef(false);
  const prevConflictCount = useRef(0);

  // ─── 初始化：首次用户手势时激活 AudioContext + 加载 SFX ─────────
  useEffect(() => {
    if (audioInitialized.current) return;

    const handleFirstInteraction = async () => {
      if (audioInitialized.current) return;
      audioInitialized.current = true;

      try {
        await audioManager.activate();
        await initSFX();
      } catch (err) {
        console.warn('[Audio] Initialization failed:', err);
      }

      // 只需要一次手势，之后移除监听
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction, { once: false });
    document.addEventListener('touchstart', handleFirstInteraction, { once: false });
    document.addEventListener('keydown', handleFirstInteraction, { once: false });

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  // ─── 路由变化 → 音乐状态 + 环境声场景 ───────────────────────────
  useEffect(() => {
    const path = location.pathname;

    // 路由到音乐状态映射
    if (path === '/chronicle') {
      audioManager.setMusicState('epic');
      audioManager.setAmbienceScene('hall');
    } else if (path === '/map') {
      audioManager.setMusicState('explore');
      audioManager.setAmbienceScene('map');
    } else if (path === '/characters') {
      audioManager.setMusicState('explore');
      audioManager.setAmbienceScene('library');
    } else if (path === '/timeline') {
      audioManager.setMusicState('explore');
      audioManager.setAmbienceScene('candle');
    } else if (path === '/factions') {
      audioManager.setMusicState('explore');
      audioManager.setAmbienceScene('library');
    } else {
      // Dashboard (/)
      audioManager.setMusicState('explore');
      audioManager.setAmbienceScene('ambient');
    }
  }, [location.pathname]);

  // ─── 冲突变化 → 冲突音效 ──────────────────────────────────────────
  useEffect(() => {
    const prevCount = prevConflictCount.current;
    const currentCount = conflicts.length;

    // 冲突从无到有：触发冲突音效
    if (prevCount === 0 && currentCount > 0) {
      audioManager.triggerConflict();
    }
    // 冲突全部解除：清除冲突
    else if (prevCount > 0 && currentCount === 0) {
      audioManager.clearConflict();
    }

    prevConflictCount.current = currentCount;
  }, [conflicts.length]);
}

/**
 * 手动激活音频（供需要立即播放音效的场景使用）
 * 例如：用户点击导航时同时激活 AudioContext
 */
export function useAudioActivation(): () => Promise<void> {
  const activated = useRef(false);

  return useCallback(async () => {
    if (activated.current) return;
    activated.current = true;

    try {
      await audioManager.activate();
      await initSFX();
    } catch (err) {
      console.warn('[Audio] Manual activation failed:', err);
    }
  }, []);
}
