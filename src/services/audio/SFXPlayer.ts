/**
 * SFXPlayer - 音效注册与初始化管理
 *
 * 基于 ProceduralSFX 程序化合成引擎，零外部音效文件依赖。
 *
 * 职责：
 * - 初始化程序化合成引擎（生成所有 27 个音效 AudioBuffer）
 * - 注册 SFC 配置到 AudioManager（音高/音量随机范围 + 优先级）
 * - 提供事件 ID 列表查询（供调试面板使用）
 */
import { audioManager } from './AudioManager';
import type { SFXConfig } from './AudioManager';
import { proceduralSFX, SFX_SYNTH_REGISTRY } from './ProceduralSFX';

// ─── SFXPlayer API ──────────────────────────────────────────────────────

/**
 * 初始化 SFX 系统
 * 1. 启动程序化合成引擎（OfflineAudioContext 渲染所有音效）
 * 2. 将合成的 AudioBuffer 注入到 AudioManager 的缓存中
 * 3. 注册所有 SFX 配置到 AudioManager
 */
export async function initSFX(): Promise<void> {
  const ctx = audioManager.getContext();
  if (!ctx) {
    console.warn('[SFXPlayer] AudioContext not available yet, skipping init');
    return;
  }

  // 1. 合成所有音效
  await proceduralSFX.init(ctx);

  // 2. 注册 SFX 配置 + 注入 AudioBuffer
  for (const [eventId, synthConfig] of Object.entries(SFX_SYNTH_REGISTRY)) {
    // 注册配置
    const sfxConfig: SFXConfig = {
      pitchRange: synthConfig.pitchRange,
      volumeRange: synthConfig.volumeRange,
      priority: synthConfig.priority,
      variantCount: synthConfig.variantCount,
    };
    audioManager.registerSFX(eventId, sfxConfig);

    // 注入合成的 AudioBuffer
    for (let v = 0; v < synthConfig.variantCount; v++) {
      const buf = proceduralSFX.getBuffer(eventId, v);
      if (buf) {
        audioManager.injectSFXBuffer(eventId, v, buf);
      }
    }
  }
}

/**
 * 懒加载指定页面的交互 SFX
 * 程序化合成不需要懒加载，所有音效在 init 时一次性生成
 * 保留接口兼容性
 */
export async function loadPageSFX(_page: string): Promise<void> {
  // no-op: 程序化合成在 initSFX 时已完成
}

/** 所有已注册的 SFX 事件 ID 列表 */
export function getRegisteredSFXIds(): string[] {
  return proceduralSFX.getEventIds();
}
