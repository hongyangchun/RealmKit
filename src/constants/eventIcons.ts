/**
 * eventIcons.ts - 事件类型图标与色彩映射
 *
 * 根据事件标签(tags)智能匹配图标和色彩，
 * 供时间轴事件节点、地图事件标记等使用。
 */

// ─── 事件图标映射规则 ─────────────────────────────────────

/** 图标映射条目 */
export interface EventIconRule {
  /** 匹配关键词（小写），出现在 title/tags/description 中即匹配 */
  keywords: string[];
  /** 显示图标名称（MUI Icon 名） */
  icon: string;
  /** 图标颜色 */
  color: string;
  /** 图标背景色（半透明） */
  bgColor: string;
  /** 叙事分类 */
  category: 'war' | 'politics' | 'life' | 'discovery' | 'culture' | 'nature';
}

/**
 * 事件图标规则表
 * 按优先级排列，匹配第一个即停止
 */
export const EVENT_ICON_RULES: EventIconRule[] = [
  // ─── 战争与冲突 ───
  {
    keywords: ['战争', '战役', '战斗', '攻城', '入侵', '征伐', '交锋', 'war', 'battle'],
    icon: 'MilitaryTech',
    color: '#e24b4a',
    bgColor: 'rgba(226,75,74,0.12)',
    category: 'war',
  },
  {
    keywords: ['围攻', '保卫', '防守', 'siege', 'defense'],
    icon: 'Shield',
    color: '#c62828',
    bgColor: 'rgba(198,40,40,0.12)',
    category: 'war',
  },
  {
    keywords: ['叛乱', '叛变', '起义', '造反', 'rebellion'],
    icon: 'Warning',
    color: '#d32f2f',
    bgColor: 'rgba(211,47,47,0.12)',
    category: 'war',
  },

  // ─── 政治与权力 ───
  {
    keywords: ['加冕', '登基', '即位', '称王', '称帝', 'coronation'],
    icon: 'EmojiEvents',
    color: '#ffd54f',
    bgColor: 'rgba(255,213,79,0.15)',
    category: 'politics',
  },
  {
    keywords: ['联盟', '结盟', '同盟', '盟约', 'alliance'],
    icon: 'Handshake',
    color: '#66bb6a',
    bgColor: 'rgba(102,187,106,0.12)',
    category: 'politics',
  },
  {
    keywords: ['条约', '和约', '协议', '协定', 'treaty'],
    icon: 'Description',
    color: '#42a5f5',
    bgColor: 'rgba(66,165,245,0.12)',
    category: 'politics',
  },
  {
    keywords: ['政变', '篡位', '夺权', 'coup'],
    icon: 'Gavel',
    color: '#8d6e63',
    bgColor: 'rgba(141,110,99,0.12)',
    category: 'politics',
  },

  // ─── 建设与发展 ───
  {
    keywords: ['建城', '奠基', '立国', '建国', '建立', '建都', 'founding'],
    icon: 'Castle',
    color: '#ffa726',
    bgColor: 'rgba(255,167,38,0.12)',
    category: 'culture',
  },
  {
    keywords: ['扩张', '开拓', '殖民', '征服', 'expansion'],
    icon: 'Terrain',
    color: '#8bc34a',
    bgColor: 'rgba(139,195,74,0.12)',
    category: 'culture',
  },

  // ─── 生命事件 ───
  {
    keywords: ['逝世', '去世', '死亡', '驾崩', '殉国', 'death', 'demise'],
    icon: 'LocalFlorist',
    color: '#9e9e9e',
    bgColor: 'rgba(158,158,158,0.12)',
    category: 'life',
  },
  {
    keywords: ['诞生', '出生', '降生', 'birth'],
    icon: 'ChildCare',
    color: '#e1f5ee',
    bgColor: 'rgba(102,187,106,0.12)',
    category: 'life',
  },
  {
    keywords: ['婚礼', '成婚', '联姻', '结婚', 'marriage', 'wedding'],
    icon: 'Favorite',
    color: '#e91e63',
    bgColor: 'rgba(233,30,99,0.12)',
    category: 'life',
  },

  // ─── 探索与发现 ───
  {
    keywords: ['发现', '探索', '远征', '航行', 'discovery', 'expedition'],
    icon: 'Explore',
    color: '#7f77dd',
    bgColor: 'rgba(127,119,221,0.12)',
    category: 'discovery',
  },
  {
    keywords: ['发明', '创造', '革新', 'invention'],
    icon: 'Lightbulb',
    color: '#ffc107',
    bgColor: 'rgba(255,193,7,0.12)',
    category: 'discovery',
  },

  // ─── 灾难与自然 ───
  {
    keywords: ['瘟疫', '饥荒', '地震', '洪水', '灾害', '灾难', 'plague', 'disaster'],
    icon: 'Storm',
    color: '#8d6e63',
    bgColor: 'rgba(141,110,99,0.12)',
    category: 'nature',
  },
  {
    keywords: ['毁灭', '沦陷', '覆灭', '灭国', 'destruction'],
    icon: 'Whatshot',
    color: '#bf360c',
    bgColor: 'rgba(191,54,12,0.12)',
    category: 'nature',
  },
];

/** 默认事件图标（无匹配时使用） */
export const DEFAULT_EVENT_ICON: EventIconRule = {
  keywords: [],
  icon: 'Circle',
  color: '#5c6bc0',
  bgColor: 'rgba(92,107,192,0.12)',
  category: 'culture',
};

// ─── 工具函数 ─────────────────────────────────────────────

/**
 * 根据事件信息匹配图标规则
 * @param title 事件标题
 * @param tags 事件标签
 * @returns 匹配到的图标规则，无匹配返回默认
 */
export function matchEventIcon(title: string, tags: string[]): EventIconRule {
  const searchText = [title, ...tags].join(' ').toLowerCase();

  for (const rule of EVENT_ICON_RULES) {
    if (rule.keywords.some((kw) => searchText.includes(kw.toLowerCase()))) {
      return rule;
    }
  }

  return DEFAULT_EVENT_ICON;
}

/**
 * 获取事件分类的叙事色带颜色
 * 用于时间轴时代色彩带
 */
export function getCategoryColor(category: EventIconRule['category']): string {
  const colors: Record<EventIconRule['category'], string> = {
    war: '#e24b4a',
    politics: '#42a5f5',
    life: '#66bb6a',
    discovery: '#7f77dd',
    culture: '#ffa726',
    nature: '#8d6e63',
  };
  return colors[category];
}
