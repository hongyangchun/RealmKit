/**
 * colors.ts - 全局统一颜色常量
 *
 * 所有用户可选的颜色选项、势力颜色、地形颜色均在此定义。
 * 其他文件应从本文件导入，禁止自行硬编码颜色数组。
 */

// =============================================================================
// 预设颜色（用户可选调色板）
// =============================================================================

/**
 * 通用预设颜色调色板
 * 用于：地图画图工具、势力编辑表单等所有需要用户选色的场景
 *
 * 32 色，按色相分组：
 *   红(4) → 橙(4) → 绿(4) → 蓝(4) → 紫(4) → 灰/深色(4) → 棕(4) → 青(4)
 */
export const PRESET_COLORS = [
  '#C0392B', '#E74C3C', '#FF6B6B', '#FFB3B3',
  '#E67E22', '#F39C12', '#FFB347', '#FFD93D',
  '#27AE60', '#2ECC71', '#58D68D', '#A9DFBF',
  '#2980B9', '#3498DB', '#5DADE2', '#AED6F1',
  '#8E44AD', '#9B59B6', '#AF7AC5', '#D2B4DE',
  '#1a237e', '#34495E', '#5D6D7E', '#85929E',
  '#8B4513', '#A0522D', '#CD853F', '#DEB887',
  '#00BCD4', '#00ACC1', '#26C6DA', '#80DEEA',
] as const;

// =============================================================================
// 地形颜色
// =============================================================================

/**
 * 地形绘制专用颜色（ColorPicker 地形层模式使用）
 * key 为地形类型中文标签，value 为对应绘制颜色
 */
export const TERRAIN_DRAW_COLORS: Record<string, string> = {
  forest: '#228B22',
  desert: '#EDC9AF',
  mountain: '#808080',
  ocean: '#1E90FF',
  swamp: '#556B2F',
  snow: '#F0F8FF',
  volcano: '#8B0000',
};

/**
 * 地形渲染颜色（地图生成 / MiniMap 渲染使用）
 * 与 types/index.ts 中 TERRAIN_COLORS 保持一致
 */
export const TERRAIN_TILE_COLORS: Record<string, string> = {
  deepOcean: '#1a5276',
  shallowWater: '#2980b9',
  beach: '#f0d9b5',
  grassland: '#52be80',
  forest: '#1e8449',
  hill: '#a67c52',
  mountain: '#7b7b7b',
  snowPeak: '#ecf0f1',
  desert: '#f4d03f',
};

/**
 * MiniMap 预览地形颜色（snake_case key，兼容旧数据）
 * 包含扩展地形类型（dense_forest, swamp, tundra, volcanic 等）
 */
export const MINIMAP_TERRAIN_COLORS: Record<string, string> = {
  deep_ocean: '#1a5276',
  ocean: '#2980b9',
  shallow_water: '#5dade2',
  beach: '#f9e79f',
  grassland: '#82e0aa',
  forest: '#27ae60',
  dense_forest: '#1e8449',
  hill: '#a9dfbf',
  mountain: '#7f8c8d',
  snow_peak: '#d5dbdb',
  desert: '#f0b27a',
  swamp: '#76d7c4',
  tundra: '#d5dbdb',
  volcanic: '#c0392b',
};

// =============================================================================
// 势力颜色
// =============================================================================

/**
 * 势力领地自动着色调色板（地图生成器使用）
 * 最多支持 6 个势力
 */
export const FACTION_TERRITORY_COLORS = [
  '#8B0000', '#00008B', '#006400', '#8B4513', '#4B0082', '#B8860B',
] as const;
