/**
 * Graph Narrative Service
 * 为关系网络图中的角色生成叙事化的关系描述
 * 基于模板拼接，不需要 AI
 */
import type { Character, Faction, Relation } from '../types';

export interface CharacterStoryData {
  character: Character;
  faction: Faction | undefined;
  neighbors: Array<{
    character: Character;
    relation: Relation;
    narrative: string;
  }>;
  overallNarrative: string;
}

// =============================================================================
// 关系类型叙事模板
// =============================================================================

const RELATION_TEMPLATES: Record<string, string> = {
  '盟友': '{source}与{target}是坚定的盟友，两人并肩作战，共同面对世界的风雨。',
  '宿敌': '{source}与{target}势不两立，两人的恩怨从何而起已无人知晓，但仇恨从未消减。',
  '师徒': '{source}拜{target}为师，习得了一身本领，但师徒之间的关系似乎并不简单。',
  '挚友': '{source}与{target}是生死之交，无论前方有何危险，两人都会并肩前行。',
  '家族': '{source}与{target}同出一族，血脉相连，但命运的齿轮将他们推向了不同的道路。',
  '背叛者': '{source}曾经信任{target}，但一次背叛改变了一切。从此，信任化为怀疑，友谊化为仇恨。',
  '对手': '{source}与{target}是对手，既相互竞争又惺惺相惜，每一次交锋都让双方变得更强。',
  '同僚': '{source}与{target}同朝为官，虽然立场未必一致，但在朝堂之上彼此深知对方的分量。',
  '恋人': '{source}与{target}之间有着一段刻骨铭心的感情，然而命运似乎总在考验着他们的爱情。',
  '亲人': '{source}与{target}血脉相连，亲情是这乱世中最珍贵的纽带。',
  '上下级': '{source}是{target}的上级，两人的关系既有权威又有信任，却暗流涌动。',
};

const DEFAULT_TEMPLATE = '{source}与{target}之间存在着一段复杂的关系——{relationType}。';

export class GraphNarrativeService {
  /**
   * 为选中的角色构建完整的故事数据
   */
  buildCharacterStory(
    characterId: string,
    characters: Character[],
    factions: Faction[],
    relations: Relation[]
  ): CharacterStoryData | null {
    const character = characters.find((c) => c.id === characterId);
    if (!character) return null;

    const faction = factions.find((f) => f.id === character.factionId);

    // 找到所有直接关系
    const neighbors = relations
      .filter((r) => r.sourceId === characterId || r.targetId === characterId)
      .map((r) => {
        const isSource = r.sourceId === characterId;
        const otherId = isSource ? r.targetId : r.sourceId;
        const otherChar = characters.find((c) => c.id === otherId);
        if (!otherChar) return null;

        return {
          character: otherChar,
          relation: r,
          narrative: this.buildRelationNarrative(
            isSource ? character : otherChar,
            isSource ? otherChar : character,
            r
          ),
        };
      })
      .filter((n): n is NonNullable<typeof n> => n !== null);

    const uniqueRelationTypes = [...new Set(neighbors.map((n) => n.relation.type))];

    return {
      character,
      faction,
      neighbors,
      overallNarrative: this.buildOverallNarrative(
        character,
        faction,
        neighbors.length,
        uniqueRelationTypes
      ),
    };
  }

  /**
   * 为单条关系生成叙事描述
   */
  private buildRelationNarrative(
    source: Character,
    target: Character,
    relation: Relation
  ): string {
    const template = RELATION_TEMPLATES[relation.type] || DEFAULT_TEMPLATE;

    let narrative = template
      .replace(/{source}/g, source.name)
      .replace(/{target}/g, target.name)
      .replace(/{relationType}/g, relation.type);

    // 如果关系有描述，追加到叙事中
    if (relation.description && relation.description.trim()) {
      narrative += ' ' + relation.description.trim();
    }

    return narrative;
  }

  /**
   * 生成角色总评叙事
   */
  private buildOverallNarrative(
    character: Character,
    faction: Faction | undefined,
    neighborCount: number,
    relationTypes: string[]
  ): string {
    const factionName = faction ? faction.name : '未知势力';
    const parts: string[] = [];

    parts.push(`${character.name}是${factionName}的重要人物。`);

    if (character.title) {
      parts.push(`身为${character.title}，${character.name}的每一步都牵动着周围的局势。`);
    }

    if (neighborCount > 0) {
      parts.push(
        `在错综复杂的关系网络中，${character.name}与${neighborCount}位人物有着千丝万缕的联系。`
      );

      if (relationTypes.length > 0) {
        const typeStr = relationTypes.join('、');
        parts.push(`这些关系涵盖${typeStr}等多种类型。`);
      }

      if (neighborCount >= 4) {
        parts.push(`${character.name}可以说是这个世界的中心人物之一。`);
      } else if (neighborCount <= 1) {
        parts.push(`虽然不常出现在台前，但${character.name}的存在却不可忽视。`);
      }
    } else {
      parts.push(`${character.name}似乎游离于世人的视线之外，独自在这片大陆上行走的旅人。`);
    }

    return parts.join('');
  }
}

/** 单例导出 */
export const graphNarrativeService = new GraphNarrativeService();
