/**
 * color.ts - 颜色工具函数
 *
 * 提供颜色亮度计算等通用方法，供需要根据背景色
 * 动态切换文字颜色的组件使用。
 */

/**
 * 判断一个 HEX 颜色是否为浅色
 *
 * 基于 WCAG 亮度公式：(R×299 + G×587 + B×114) / 1000
 * 阈值 155 —— 大于该值为浅色，文字应使用深色；反之使用白色。
 *
 * @param hex - 六位 HEX 色值，如 '#1a237e'
 */
export const isLightColor = (hex: string): boolean => {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return false;
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
};

/**
 * 根据背景色返回适配的文字颜色
 *
 * 浅色背景 → 深蓝 #1a237e，深色背景 → 白色 #fff。
 * 可直接用于 faction banner、city card 等场景。
 */
export const getContrastTextColor = (bgHex: string): string =>
  isLightColor(bgHex) ? '#1a237e' : '#ffffff';
