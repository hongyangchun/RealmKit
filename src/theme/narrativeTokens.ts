/**
 * narrativeTokens.ts - 叙事色彩令牌体系
 *
 * 基于 RealmKit 视觉叙事 DNA：
 *   古典书卷 × 星空幻想 × 手绘地图
 *
 * 色调：深蓝夜空 · 金色点缀 · 羊皮纸暖白
 */

// ─── 主叙事色 ─────────────────────────────────────────────

/** 深蓝夜空 — 世界的主色调，承载星空与深海的意象 */
export const night = {
  50: '#e8eaf6',
  100: '#c5cae9',
  200: '#9fa8da',
  300: '#7986cb',
  400: '#5c6bc0',
  500: '#3f51b5',
  600: '#3949ab',
  700: '#283593',
  800: '#1a237e', // 主色
  900: '#0d1b2a', // 最深底色
} as const;

/** 金色烛光 — 故事的温暖，点缀在黑暗中的希望之光 */
export const candle = {
  50: '#fff8e1',
  100: '#ffecb3',
  200: '#ffe082',
  300: '#ffd54f',
  400: '#ffca28',
  500: '#ffc107',
  600: '#ffb300',
  700: '#ffa000',
  800: '#f9a825', // 浓金
} as const;

/** 羊皮纸 — 古典书卷的底色，故事书写的承载 */
export const parchment = {
  background: '#faf3e0',
  surface: '#f5f0e8',
  card: '#fffdf5',
  border: 'rgba(139,105,20,0.3)',
  shadow: 'rgba(139,69,19,0.08)',
  text: '#5d4037',
} as const;

// ─── 叙事语义色 ───────────────────────────────────────────

/** 叙事时代色彩 — 对应世界历史的不同阶段 */
export const narrativeEra = {
  /** 黎明/开创 — 万物初生 */
  dawn: '#e1f5ee',
  /** 繁荣/盛世 — 金色年华 */
  prosperity: '#ffd54f',
  /** 冲突/战争 — 铁与血 */
  conflict: '#e24b4a',
  /** 神秘/未知 — 迷雾与魔法 */
  mystery: '#7f77dd',
  /** 传承/历史 — 古籍与遗迹 */
  legacy: '#a67c52',
  /** 衰落/落幕 — 灰烬与沉默 */
  decline: '#9e9e9e',
} as const;

/** 事件类型色彩 — 时间轴上的叙事图标 */
export const eventType = {
  war: '#e24b4a',
  alliance: '#66bb6a',
  founding: '#ffa726',
  death: '#9e9e9e',
  coronation: '#ffd54f',
  discovery: '#7f77dd',
  treaty: '#42a5f5',
  disaster: '#8d6e63',
} as const;

// ─── 势力色彩语言 ─────────────────────────────────────────

/**
 * 势力配色方案 — 每个势力拥有独特的视觉身份
 * 用于卡牌色带、地图领地、关系图节点等
 */
export const factionPalette = {
  /** 朱红 — 王权/帝国 */
  crimson: {
    primary: '#c62828',
    light: '#ef5350',
    dark: '#8e0000',
    glow: 'rgba(198,40,40,0.3)',
  },
  /** 靛蓝 — 智慧/魔法 */
  indigo: {
    primary: '#283593',
    light: '#5c6bc0',
    dark: '#001064',
    glow: 'rgba(40,53,147,0.3)',
  },
  /** 翠绿 — 自然/森林 */
  emerald: {
    primary: '#2e7d32',
    light: '#60ad5e',
    dark: '#005005',
    glow: 'rgba(46,125,50,0.3)',
  },
  /** 琥珀 — 商贸/财富 */
  amber: {
    primary: '#f9a825',
    light: '#ffd95a',
    dark: '#c17900',
    glow: 'rgba(249,168,37,0.3)',
  },
  /** 紫晶 — 宗教/神秘 */
  amethyst: {
    primary: '#6a1b9a',
    light: '#9c4dcc',
    dark: '#38006b',
    glow: 'rgba(106,27,154,0.3)',
  },
  /** 青铜 — 战争/锻造 */
  bronze: {
    primary: '#795548',
    light: '#a98274',
    dark: '#4b2c20',
    glow: 'rgba(121,85,72,0.3)',
  },
} as const;

/** 势力颜色索引 — 用于按顺序分配势力颜色 */
export const factionColorOrder: ReadonlyArray<keyof typeof factionPalette> = [
  'crimson',
  'indigo',
  'emerald',
  'amber',
  'amethyst',
  'bronze',
];

// ─── 关系类型色彩 ─────────────────────────────────────────

/** 关系连线视觉语义 */
export const relationStyle = {
  ally: {
    color: '#66bb6a',
    pattern: 'solid' as const,
    glow: true,
  },
  enemy: {
    color: '#e24b4a',
    pattern: 'dashed' as const,
    glow: false,
  },
  blood: {
    color: '#ffd54f',
    pattern: 'double' as const,
    glow: true,
  },
  mentor: {
    color: '#7f77dd',
    pattern: 'dotted' as const,
    glow: false,
  },
} as const;

// ─── 渐变预设 ─────────────────────────────────────────────

/** 常用渐变 — 用于 Hero 区域、背景等 */
export const gradients = {
  /** 夜空渐变 — 主背景 */
  nightSky: 'linear-gradient(180deg, #0d1b2a 0%, #1a237e 50%, #283593 100%)',
  /** 羊皮纸渐变 — 卡片背景 */
  parchmentRoll: 'linear-gradient(180deg, #faf3e0 0%, #f5f0e8 100%)',
  /** 金色光芒 — 强调元素 */
  goldenGlow: 'radial-gradient(circle, rgba(255,213,79,0.4) 0%, transparent 70%)',
  /** 黎明渐变 — 空状态背景 */
  dawn: 'linear-gradient(180deg, #0d1b2a 0%, #1a237e 40%, #283593 70%, #e1f5ee 100%)',
  /** 神秘迷雾 */
  mystery: 'radial-gradient(ellipse at center, rgba(127,119,221,0.15) 0%, transparent 70%)',
} as const;

// ─── 阴影预设 ─────────────────────────────────────────────

/** 叙事阴影 — 营造深度与层次 */
export const shadows = {
  /** 古典卡片阴影 */
  classic: '0 1px 3px rgba(0,0,0,0.08), 0 2px 8px rgba(139,69,19,0.08)',
  /** 悬浮阴影 */
  elevated: '0 4px 12px rgba(0,0,0,0.12), 0 2px 4px rgba(139,69,19,0.08)',
  /** 深度阴影 — 弹窗/对话框 */
  deep: '0 8px 24px rgba(0,0,0,0.18), 0 4px 8px rgba(13,27,42,0.12)',
  /** 金色光晕 — 高亮元素 */
  goldenGlow: '0 0 12px rgba(255,213,79,0.3), 0 0 4px rgba(255,213,79,0.15)',
  /** 势力光晕 — 需配合势力色 */
  factionGlow: (color: string, opacity = 0.3) =>
    `0 0 16px rgba(${hexToRgb(color)},${opacity}), 0 0 4px rgba(${hexToRgb(color)},${opacity * 0.5})`,
} as const;

// ─── 动画时长 ─────────────────────────────────────────────

/** 叙事动画时长预设 */
export const duration = {
  instant: 100,
  fast: 200,
  normal: 350,
  slow: 500,
  narrative: 800, // 叙事节奏 — 更慢、更有仪式感
  epic: 1200,     // 史诗级动画 — 世界生成等重大时刻
} as const;

/** 缓动函数 */
export const easing = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  /** 叙事缓动 — 有「呼吸感」的出入 */
  narrative: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  /** 史诗缓动 — 大幅度的戏剧性运动 */
  epic: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

// ─── 工具函数 ─────────────────────────────────────────────

/** 将 hex 颜色转为 r,g,b 字符串 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0,0,0';
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}

/** 根据势力索引获取配色 */
export function getFactionColors(index: number) {
  const key = factionColorOrder[index % factionColorOrder.length];
  return factionPalette[key];
}

// ─── 聚合导出 ─────────────────────────────────────────────

export const narrativeTokens = {
  night,
  candle,
  parchment,
  narrativeEra,
  eventType,
  factionPalette,
  factionColorOrder,
  relationStyle,
  gradients,
  shadows,
  duration,
  easing,
} as const;

export default narrativeTokens;
