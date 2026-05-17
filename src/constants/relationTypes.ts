/**
 * 关系类型常量 & 颜色映射
 * 全局共享，GraphPage / RelationPage / CharacterStoryCard 统一引用
 */

export const RELATION_TYPES = [
  '盟友', '宿敌', '师徒', '挚友', '家族',
  '背叛者', '对手', '同僚', '恋人', '亲人', '上下级',
] as const;

/** 关系类型 → 显示颜色 */
export const RELATION_COLORS: Record<typeof RELATION_TYPES[number], string> = {
  '盟友': '#27ae60',
  '宿敌': '#C0392B',
  '师徒': '#8e44ad',
  '挚友': '#2980b9',
  '家族': '#f39c12',
  '背叛者': '#e74c3c',
  '对手': '#e67e22',
  '同僚': '#1abc9c',
  '恋人': '#e91e63',
  '亲人': '#ff9800',
  '上下级': '#607d8b',
};
