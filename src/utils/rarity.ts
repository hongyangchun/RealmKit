/**
 * 稀有度自动计算工具
 * 基于技能数/传记长度/事件关联自动判定稀有度
 * 支持手动覆盖
 */
import type { CardRarity, Character } from '../types';

export interface RarityInput {
  skillCount: number;
  bioLength: number;
  relatedEventCount: number;
}

/**
 * 根据规则自动计算稀有度
 *
 * 规则:
 * - common:   默认（不满足任何更高条件）
 * - rare:     技能 ≥ 4 个
 * - epic:     技能 ≥ 5 个 && 传记 ≥ 100 字
 * - legendary: 技能 ≥ 6 个 && 传记 ≥ 200 字 && 事件关联 ≥ 5
 */
export function calcAutoRarity(input: RarityInput): CardRarity {
  const { skillCount, bioLength, relatedEventCount } = input;

  if (skillCount >= 6 && bioLength >= 200 && relatedEventCount >= 5) {
    return 'legendary';
  }
  if (skillCount >= 5 && bioLength >= 100) {
    return 'epic';
  }
  if (skillCount >= 4) {
    return 'rare';
  }
  return 'common';
}

/**
 * 从 Character 对象直接计算稀有度
 */
export function calcRarityForCharacter(ch: Partial<Character>): CardRarity {
  return calcAutoRarity({
    skillCount: ch.skills?.length ?? 0,
    bioLength: ch.bio?.length ?? 0,
    relatedEventCount: ch.relatedEventIds?.length ?? 0,
  });
}

/** 稀有度中文标签 */
export const RARITY_LABEL: Record<CardRarity, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

/** 稀有度排序权重 */
export const RARITY_ORDER: Record<CardRarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};
