/**
 * Plot Suggestion Service
 * 基于人物特质和技能生成剧情建议
 * AI模式：调用大模型生成个性化建议
 * 模板模式：无AI时使用规则引擎生成建议
 */
import type { Character, Faction, AiConfig } from '../types';
import { aiService } from './aiService';

// =============================================================================
// 类型定义
// =============================================================================

export interface PlotSuggestion {
  id: string;
  title: string;
  description: string;
  suggestedEventType?: string;
  prefilledEvent?: {
    title: string;
    description: string;
    tags: string[];
  };
}

// =============================================================================
// 特质 → 剧情模板映射
// =============================================================================

const TRAIT_PLOTS: Record<string, Array<{ title: string; desc: string; eventType: string }>> = {
  '勇敢': [
    { title: '勇者的试炼', desc: '{name}面对一个看似不可能的挑战——独自穿越禁地，去寻找传说中的宝物。', eventType: '冒险' },
    { title: '战场上的抉择', desc: '在{faction}与敌军的激烈交锋中，{name}必须做出一个影响战局的决定。', eventType: '战役' },
  ],
  '智慧': [
    { title: '智破迷局', desc: '{name}发现了一个隐藏在普通事件背后的巨大阴谋，真相可能颠覆整个{faction}。', eventType: '阴谋' },
    { title: '解密古卷', desc: '一份远古文献中记载着改变世界格局的秘密，只有{name}的智慧才能破解其中的密码。', eventType: '发现' },
  ],
  '野心勃勃': [
    { title: '权力的诱惑', desc: '{name}暗中策划着一个大胆的计划——夺取{faction}的最高权力，但代价可能超出想象。', eventType: '政治' },
  ],
  '忠诚': [
    { title: '守护誓言', desc: '即使所有人都认为{faction}已经无望，{name}依然坚守阵地，等待最后的转机。', eventType: '保卫战' },
  ],
  '狡诈': [
    { title: '暗中布局', desc: '{name}在多方势力之间周旋，每一步棋都精心计算，一个错误就可能万劫不复。', eventType: '阴谋' },
  ],
  '暴烈': [
    { title: '怒火之战', desc: '一次不可饶恕的背叛激怒了{name}，一场雷霆之怒即将降临。', eventType: '战役' },
  ],
  '神秘': [
    { title: '隐藏的身份', desc: '{name}的真实身份远比表面看到的更加复杂——一段被封印的过去即将揭晓。', eventType: '揭秘' },
  ],
  '仁慈': [
    { title: '以德报怨', desc: '当所有人都要求处死战俘时，{name}做出了一个出乎所有人意料的决定。', eventType: '外交' },
  ],
  '好奇心重': [
    { title: '禁忌之地', desc: '{name}无法抵挡好奇心，独自闯入了一片被诅咒的禁地。', eventType: '冒险' },
  ],
  '固执': [
    { title: '一意孤行', desc: '所有人劝{name}放弃，但{name}坚持自己的判断——事实证明，有时候固执也是一种力量。', eventType: '冒险' },
  ],
  '淡泊名利': [
    { title: '隐者归来', desc: '隐居多年的{name}被一场突如其来的危机重新卷入了世界的纷争。', eventType: '回归' },
  ],
  '冷酷': [
    { title: '冰冷的审判', desc: '{name}以铁血手段执行了一项令人震惊的决定，整个{faction}为之震动。', eventType: '审判' },
  ],
  '温和': [
    { title: '和平的代价', desc: '{name}试图在交战双方之间斡旋和平，但和平的代价可能比战争更高。', eventType: '外交' },
  ],
  '孤傲': [
    { title: '独行侠的救赎', desc: '{name}一向独来独往，但一场危机让他不得不学会信任他人。', eventType: '冒险' },
  ],
  '顽固': [
    { title: '不灭的信念', desc: '即使全世界都站在对立面，{name}也绝不放弃自己的信念。', eventType: '抗争' },
  ],
  '正义感强': [
    { title: '正义的呼声', desc: '面对权贵的压迫，{name}挺身而出，为弱者发声——代价是失去一切，但换来的是人民的拥戴。', eventType: '抗争' },
  ],
  '冒险': [
    { title: '未知的探索', desc: '{name}听闻了一处从未有人踏足的秘境，那里或许藏有改变世界的秘密。', eventType: '探险' },
  ],
};

// =============================================================================
// 服务类
// =============================================================================

export class PlotSuggestionService {
  /**
   * 获取基于模板的剧情建议
   * 根据人物特质匹配模板，生成 3-4 条建议
   */
  getTemplateSuggestions(character: Character, faction?: Faction): PlotSuggestion[] {
    const suggestions: PlotSuggestion[] = [];
    const charName = character.name;
    const factionName = faction?.name || '未知势力';

    // 收集已选过的模板索引，避免重复
    const usedIndices = new Set<string>();

    for (const trait of character.traits) {
      const templates = TRAIT_PLOTS[trait];
      if (!templates) continue;

      // 从该特质的模板中随机选 1-2 个
      const shuffled = [...templates].sort(() => Math.random() - 0.5);
      const count = Math.min(shuffled.length, 2);

      for (let i = 0; i < count; i++) {
        const key = `${trait}-${i}`;
        if (usedIndices.has(key)) continue;
        usedIndices.add(key);

        const tpl = shuffled[i];
        const filledTitle = tpl.title;
        const filledDesc = tpl.desc
          .replace(/\{name\}/g, charName)
          .replace(/\{faction\}/g, factionName);

        suggestions.push({
          id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          title: filledTitle,
          description: filledDesc,
          suggestedEventType: tpl.eventType,
          prefilledEvent: {
            title: filledTitle,
            description: filledDesc,
            tags: [tpl.eventType],
          },
        });

        if (suggestions.length >= 4) break;
      }

      if (suggestions.length >= 4) break;
    }

    // 如果特质不足以生成 2 条，添加一个通用建议
    if (suggestions.length < 2) {
      const genericTemplates = [
        {
          title: '命运的交汇',
          desc: '在{faction}的一场重大集会上，{name}与另一位关键人物不期而遇——这次相遇将改变许多人的命运。',
          eventType: '关键事件',
        },
        {
          title: '意外的挑战',
          desc: '{name}收到了一封神秘的挑战书，发信人不明，但似乎对{name}的过去了如指掌……',
          eventType: '悬疑',
        },
        {
          title: '转折的前夜',
          desc: '暴风雨来临之前，{name}在{faction}的某处独自思考——明天，一切都将不同。',
          eventType: '转折',
        },
      ];

      const shuffled = genericTemplates.sort(() => Math.random() - 0.5);
      const needed = 2 - suggestions.length;

      for (let i = 0; i < needed; i++) {
        const tpl = shuffled[i];
        const filledDesc = tpl.desc
          .replace(/\{name\}/g, charName)
          .replace(/\{faction\}/g, factionName);

        suggestions.push({
          id: `gen_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          title: tpl.title,
          description: filledDesc,
          suggestedEventType: tpl.eventType,
          prefilledEvent: {
            title: tpl.title,
            description: filledDesc,
            tags: [tpl.eventType],
          },
        });
      }
    }

    return suggestions.slice(0, 4);
  }

  /**
   * 构建AI提示词
   */
  private buildPrompt(
    character: Character,
    faction?: Faction
  ): { system: string; user: string } {
    const traits = character.traits.join('、') || '无';
    const skills = character.skills.map((s) => `${s.name}(${s.type === 'active' ? '主动' : s.type === 'passive' ? '被动' : '特殊'})`).join('、') || '无';
    const bio = character.bio || '暂无传记';

    const system = `你是一位专业的架空世界剧情设计师。你的任务是根据一个人物角色的特征，创作出富有戏剧张力的剧情建议。
请以JSON数组格式返回3条剧情建议，每条包含：
- title: 剧情标题（简短有力，1-5个字）
- description: 剧情描述（50-100字，有画面感，像小说片段）
- eventType: 事件类型（如：战役、阴谋、冒险、政治、揭秘等）

要求：
1. 剧情要紧密围绕该人物的特质、技能和背景
2. 具有戏剧冲突和悬念
3. 适合12岁儿童的阅读水平，但不失深度
4. 语言生动，画面感强`;

    const user = `请为以下人物设计剧情建议：

【人物信息】
- 姓名：${character.name}
- 职衔：${character.title || '无'}
- 势力：${faction?.name || '无'}
- 特质：${traits}
- 技能：${skills}
- 传记：${bio}

请返回JSON数组格式的剧情建议。`;

    return { system, user };
  }

  /**
   * 调用AI API
   */
  private async callAi(
    config: AiConfig,
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    return aiService.callLlm(config, systemPrompt, userPrompt);
  }

  /**
   * 解析AI响应
   */
  private parseResponse(text: string): PlotSuggestion[] {
    try {
      // 尝试提取JSON数组
      let jsonStr = text.trim();

      // 处理markdown代码块
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      // 处理可能的额外文本包裹
      if (!jsonStr.startsWith('[')) {
        const arrayMatch = jsonStr.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (arrayMatch) {
          jsonStr = arrayMatch[0];
        }
      }

      const parsed = JSON.parse(jsonStr);

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      return parsed.slice(0, 4).map((item: any, index: number) => ({
        id: `ai_${Date.now()}_${index}`,
        title: item.title || '未命名剧情',
        description: item.description || '',
        suggestedEventType: item.eventType,
        prefilledEvent: item.title
          ? {
              title: item.title,
              description: item.description || '',
              tags: item.eventType ? [item.eventType] : [],
            }
          : undefined,
      }));
    } catch {
      return [];
    }
  }

  /**
   * AI驱动的剧情建议
   */
  async suggestForCharacter(
    config: AiConfig,
    character: Character,
    faction?: Faction
  ): Promise<PlotSuggestion[]> {
    const { system, user } = this.buildPrompt(character, faction);

    try {
      const response = await this.callAi(config, system, user);
      const suggestions = this.parseResponse(response);

      if (suggestions.length === 0) {
        // AI返回格式不对，降级到模板
        return this.getTemplateSuggestions(character, faction);
      }

      return suggestions;
    } catch (err) {
      console.warn('[PlotSuggestionService] AI调用失败，降级到模板:', err);
      return this.getTemplateSuggestions(character, faction);
    }
  }
}

/** 单例导出 */
export const plotSuggestionService = new PlotSuggestionService();
