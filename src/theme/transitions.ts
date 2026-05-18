/**
 * transitions.ts - 叙事动画令牌体系
 *
 * 统一管理所有过渡动画，确保全局一致的叙事节奏。
 * 所有动画使用 CSS transforms / opacity，避免触发重排。
 *
 * 使用方式：
 * ```tsx
 * import { transitions } from '../theme/transitions';
 *
 * <Box sx={{ transition: transitions.fade.normal }}>
 *   ...
 * </Box>
 * ```
 */

import { keyframes } from '@mui/material';

// ─── 时长预设 ─────────────────────────────────────────────

export const duration = {
  /** 瞬时 — 100ms，用于微小反馈（涟漪、高亮） */
  instant: 100,
  /** 快速 — 200ms，用于按钮状态切换 */
  fast: 200,
  /** 标准 — 350ms，用于常规过渡 */
  normal: 350,
  /** 慢速 — 500ms，用于面板展开/折叠 */
  slow: 500,
  /** 叙事节奏 — 800ms，有仪式感的入场 */
  narrative: 800,
  /** 史诗级 — 1200ms，世界生成等重大时刻 */
  epic: 1200,
} as const;

// ─── 缓动函数 ─────────────────────────────────────────────

export const easing = {
  /** 标准缓动 — MUI 默认 */
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** 减速缓入 — 适合元素出现 */
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  /** 加速缓出 — 适合元素消失 */
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  /** 叙事缓动 — 有「呼吸感」的出入 */
  narrative: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  /** 弹性缓动 — 回弹效果 */
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

// ─── 过渡预设字符串 ───────────────────────────────────────

export const transitions = {
  /** 淡入淡出 */
  fade: {
    instant: `opacity ${duration.instant}ms ${easing.standard}`,
    fast: `opacity ${duration.fast}ms ${easing.standard}`,
    normal: `opacity ${duration.normal}ms ${easing.decelerate}`,
    slow: `opacity ${duration.slow}ms ${easing.decelerate}`,
    narrative: `opacity ${duration.narrative}ms ${easing.narrative}`,
  },
  /** 上浮入场 — 元素从下方滑入 + 淡入 */
  slideUp: {
    fast: `transform ${duration.fast}ms ${easing.decelerate}, opacity ${duration.fast}ms ${easing.decelerate}`,
    normal: `transform ${duration.normal}ms ${easing.decelerate}, opacity ${duration.normal}ms ${easing.decelerate}`,
    narrative: `transform ${duration.narrative}ms ${easing.narrative}, opacity ${duration.narrative}ms ${easing.narrative}`,
  },
  /** 缩放 — 卡片悬停、按钮按压 */
  scale: {
    fast: `transform ${duration.fast}ms ${easing.standard}`,
    normal: `transform ${duration.normal}ms ${easing.standard}`,
  },
  /** 组合 — 位移 + 透明度 + 阴影 */
  card: {
    hover: `transform ${duration.fast}ms ${easing.standard}, box-shadow ${duration.fast}ms ${easing.standard}`,
    enter: `transform ${duration.normal}ms ${easing.decelerate}, opacity ${duration.normal}ms ${easing.decelerate}, box-shadow ${duration.normal}ms ${easing.decelerate}`,
  },
  /** 页面切换 */
  page: {
    enter: `opacity ${duration.slow}ms ${easing.decelerate}, transform ${duration.slow}ms ${easing.decelerate}`,
    exit: `opacity ${duration.normal}ms ${easing.accelerate}, transform ${duration.normal}ms ${easing.accelerate}`,
  },
} as const;

// ─── 关键帧动画 ───────────────────────────────────────────

/** 脉冲 — 用于 ConflictBadge 等暗示"这里有故事" */
export const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.08);
    opacity: 0.85;
  }
`;

/** 柔和呼吸 — 用于 Hero 区域背景 */
export const breathe = keyframes`
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
`;

/** 渐显 — 从透明到不透明 */
export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

/** 上滑渐显 — 从下方滑入并渐显 */
export const slideUpFade = keyframes`
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

/** 列表项交错渐显 — 需配合 animation-delay */
export const staggerItem = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

/** 金色光晕脉冲 */
export const goldenPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 4px rgba(255,213,79,0.2);
  }
  50% {
    box-shadow: 0 0 12px rgba(255,213,79,0.4), 0 0 4px rgba(255,213,79,0.15);
  }
`;

/** 打字机效果 — 用于故事种子 */
export const typewriter = keyframes`
  from { width: 0; }
  to { width: 100%; }
`;

/** 涟漪扩散 — 用于地图标记点击 */
export const ripple = keyframes`
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(2.4);
    opacity: 0;
  }
`;

// ─── 交错动画工具 ─────────────────────────────────────────

/**
 * 为列表项生成交错动画延迟样式
 * @param index 列表项索引
 * @param baseDelay 基础延迟（ms），默认 50
 * @returns CSS animation-delay 值
 */
export function staggerDelay(index: number, baseDelay = 50): string {
  return `${index * baseDelay}ms`;
}

/**
 * 为列表项生成交错入场样式
 * @param index 列表项索引
 * @param baseDelay 基础延迟（ms），默认 50
 */
export function staggerStyle(index: number, baseDelay = 50) {
  return {
    animation: `${staggerItem} ${duration.normal}ms ${easing.decelerate} both`,
    animationDelay: staggerDelay(index, baseDelay),
  };
}

// ─── 减少动画偏好 ─────────────────────────────────────────

/**
 * 检测用户是否偏好减少动画
 * 用于条件性地禁用复杂动画
 */
export const reducedMotionMediaQuery = '@media (prefers-reduced-motion: reduce)';

/**
 * 为复杂动画组件生成减少动画的覆盖样式
 */
export const reducedMotionOverride = {
  [reducedMotionMediaQuery]: {
    animation: 'none !important' as const,
    transition: `opacity ${duration.instant}ms ${easing.standard} !important`,
  },
};

// ─── 聚合导出 ─────────────────────────────────────────────

const transitionKit = {
  duration,
  easing,
  transitions,
  // keyframes
  pulse,
  breathe,
  fadeIn,
  slideUpFade,
  staggerItem,
  goldenPulse,
  typewriter,
  ripple,
  // 工具
  staggerDelay,
  staggerStyle,
  reducedMotionMediaQuery,
  reducedMotionOverride,
} as const;

export default transitionKit;
