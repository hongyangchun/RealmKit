/**
 * AudioStore - 音频设置状态管理
 * Zustand store，持久化到 localStorage
 * 管理用户音频偏好：音量、静音、音乐/环境声开关
 */
import { create } from 'zustand';

// ─── Types ──────────────────────────────────────────────────────────────

export interface AudioSettings {
  /** 主音量 0-1 */
  masterVolume: number;
  /** 音效音量 0-1 */
  sfxVolume: number;
  /** 音乐音量 0-1 */
  musicVolume: number;
  /** 环境声音量 0-1 */
  ambienceVolume: number;
  /** 全局静音 */
  isMuted: boolean;
  /** 音乐开关 */
  musicEnabled: boolean;
  /** 环境声开关 */
  ambienceEnabled: boolean;
}

interface AudioStore extends AudioSettings {
  setMasterVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  setAmbienceVolume: (v: number) => void;
  toggleMute: () => void;
  toggleMusic: () => void;
  toggleAmbience: () => void;
  /** 批量恢复设置（从 localStorage 读取时用） */
  restoreSettings: (settings: Partial<AudioSettings>) => void;
}

// ─── Defaults ───────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 0.7,
  sfxVolume: 0.8,
  musicVolume: 0.5,
  ambienceVolume: 0.4,
  isMuted: false,
  musicEnabled: true,
  ambienceEnabled: true,
};

// ─── Persistence ────────────────────────────────────────────────────────

const STORAGE_KEY = 'zzworld_audio_settings';

function loadSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // corrupt data, use defaults
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: AudioSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage full, silently fail
  }
}

// ─── Store ──────────────────────────────────────────────────────────────

export const useAudioStore = create<AudioStore>((set, get) => {
  const initial = loadSettings();

  const updateAndPersist = (partial: Partial<AudioSettings>) => {
    const next = { ...get(), ...partial };
    saveSettings(next);
    set(next);
  };

  return {
    ...initial,

    setMasterVolume: (v: number) => updateAndPersist({ masterVolume: clampVolume(v) }),
    setSfxVolume: (v: number) => updateAndPersist({ sfxVolume: clampVolume(v) }),
    setMusicVolume: (v: number) => updateAndPersist({ musicVolume: clampVolume(v) }),
    setAmbienceVolume: (v: number) => updateAndPersist({ ambienceVolume: clampVolume(v) }),

    toggleMute: () => {
      const next = !get().isMuted;
      updateAndPersist({ isMuted: next });
    },
    toggleMusic: () => {
      const next = !get().musicEnabled;
      updateAndPersist({ musicEnabled: next });
    },
    toggleAmbience: () => {
      const next = !get().ambienceEnabled;
      updateAndPersist({ ambienceEnabled: next });
    },

    restoreSettings: (settings: Partial<AudioSettings>) => {
      const merged = { ...get(), ...settings };
      saveSettings(merged);
      set(merged);
    },
  };
});

// ─── Helpers ────────────────────────────────────────────────────────────

function clampVolume(v: number): number {
  return Math.max(0, Math.min(1, v));
}
