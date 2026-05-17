/**
 * AI Service
 * 统一封装 LLM API 调用（OpenAI 兼容格式）
 * 用于世界编年史生成和角色剧情建议
 */
import type { AiConfig, WorldData, Character, Faction, Relation, HistoryEvent } from '../types';

// =============================================================================
// 类型定义
// =============================================================================

export interface ChronicleGenerationResult {
  content: string;
  yearRange: { start: number; end: number };
}

export interface PlotSuggestionResult {
  suggestions: string[];
}

// =============================================================================
// Prompt 模板
// =============================================================================

const CHRONICLE_SYSTEM_PROMPT = `你是一位架空世界的历史书记官。请用富有文学性的中文，撰写一段该世界的编年史叙事。

要求：
1. 语言生动，富有想象力，适合12岁孩子阅读
2. 以编年体形式讲述，事件之间有过渡句，像读故事一样连贯
3. 突出人物个性和命运转折
4. 可以添加合理的虚构细节使叙事更丰富
5. 不要列表，要写成连贯的叙事段落
6. 字数控制在500-800字左右
7. 如果某段时期没有记录的重要事件，可以根据已有信息进行合理的虚构补充`;

const CHRONICLE_USER_PROMPT_TEMPLATE = (startYear: number, endYear: number, worldContext: string) =>
  `请为这个架空世界撰写 ${startYear} 年至 ${endYear} 年的编年史：

${worldContext}`;

const PLOT_SYSTEM_PROMPT = `你是创作灵感导师。请根据以下人物信息，给出激动人心的剧情发展建议。

要求：
1. 每个建议用1-2句话描述
2. 要有戏剧冲突或意外转折
3. 能推动故事发展
4. 直接输出3条建议，每条一行，格式："💡 建议：具体描述"
5. 如果有相关人物，可以设计他们之间的互动`;

const PLOT_USER_PROMPT_TEMPLATE = (
  charName: string,
  title: string | undefined,
  faction: string,
  traits: string[],
  bio: string,
  relations: string
) =>
  `人物信息：
姓名：${charName}
职衔：${title || '无'}
势力：${faction}
特质：${traits.join('、') || '未知'}
简介：${bio}

已知关系：
${relations || '暂无记录'}

请给出3个剧情建议：`;

// =============================================================================
// 服务类
// =============================================================================

class AiService {
  /**
   * 验证配置是否完整
   */
  validateConfig(config: AiConfig): boolean {
    return Boolean(
      config.apiEndpoint?.trim() && config.apiKey?.trim() && config.modelName?.trim()
    );
  }

  /**
   * 调用 LLM API
   */
  async callLlm(config: AiConfig, systemPrompt: string, userPrompt: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      const response = await fetch(config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: config.maxTokens || 2000,
          temperature: 0.8,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('API密钥无效或权限不足，请检查设置');
        }
        if (response.status === 429) {
          throw new Error('请求过于频繁，请稍后再试');
        }
        throw new Error(`AI服务错误 (${response.status})，请稍后再试`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content || content.trim() === '') {
        throw new Error('生成内容为空，请重试');
      }

      return content.trim();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('请求超时，请检查网络后重试');
        }
        throw error;
      }
      throw new Error('网络连接失败，请检查网络');
    }
  }

  /**
   * 生成世界编年史叙事
   */
  async generateChronicle(
    config: AiConfig,
    worldData: WorldData,
    startYear: number,
    endYear: number
  ): Promise<string> {
    const worldContext = this._buildWorldContext(worldData, startYear, endYear);
    const userPrompt = CHRONICLE_USER_PROMPT_TEMPLATE(startYear, endYear, worldContext);
    return this.callLlm(config, CHRONICLE_SYSTEM_PROMPT, userPrompt);
  }

  /**
   * 生成角色剧情建议
   */
  async generatePlotSuggestions(
    config: AiConfig,
    character: Character,
    factionName: string,
    relatedCharacters: Character[],
    relations: Relation[]
  ): Promise<string[]> {
    const relationsText = this._buildRelationsText(character, relatedCharacters, relations);
    const userPrompt = PLOT_USER_PROMPT_TEMPLATE(
      character.name,
      character.title,
      factionName,
      character.traits,
      character.bio,
      relationsText
    );

    const response = await this.callLlm(config, PLOT_SYSTEM_PROMPT, userPrompt);

    // 解析响应中的3条建议
    const lines = response.split('\n').filter((line) => line.trim());
    const suggestions: string[] = [];

    for (const line of lines) {
      // 匹配 "💡 建议：" 或 "建议：" 或数字开头
      const match = line.match(/[💡]?\s*建议[：:]\s*(.+)/i) || line.match(/^\d+[.、](.+)/);
      if (match) {
        suggestions.push(match[1].trim());
      }
    }

    // 如果解析失败，尝试按行分割
    if (suggestions.length < 3) {
      const allLines = response.split(/[💡\n]/).filter(Boolean);
      for (const l of allLines) {
        const trimmed = l.replace(/^[:：\s\d]+/, '').trim();
        if (trimmed && trimmed.length > 10) {
          suggestions.push(trimmed);
        }
        if (suggestions.length >= 3) break;
      }
    }

    return suggestions.slice(0, 3);
  }

  // ─── 私有方法 ─────────────────────────────────────────────────────────────

  /**
   * 构建世界上下文文本
   */
  private _buildWorldContext(worldData: WorldData, startYear: number, endYear: number): string {
    const parts: string[] = [];

    // 势力
    if (worldData.factions.length > 0) {
      parts.push('【世界势力】');
      for (const f of worldData.factions) {
        parts.push(`• ${f.name}：${f.description || '无描述'}`);
      }
      parts.push('');
    }

    // 人物
    if (worldData.characters.length > 0) {
      parts.push('【重要人物】');
      for (const c of worldData.characters) {
        const faction = worldData.factions.find((f) => f.id === c.factionId);
        const traits = c.traits.length > 0 ? `（${c.traits.join('、')}）` : '';
        const lifespan =
          c.birthYear !== undefined
            ? c.deathYear !== undefined
              ? `${c.birthYear}-${c.deathYear}年`
              : `${c.birthYear}年至今`
            : '';
        parts.push(
          `• ${c.name}${c.title ? `（${c.title}）` : ''} - ${faction?.name || '无势力'}${traits} ${lifespan}`
        );
        if (c.bio) parts.push(`  ${c.bio}`);
      }
      parts.push('');
    }

    // 该时间段内的事件
    const eventsInRange = worldData.events.filter(
      (e) => e.year >= startYear && e.year <= endYear
    );

    if (eventsInRange.length > 0) {
      parts.push(`【${startYear}-${endYear}年重大事件】`);
      const sorted = [...eventsInRange].sort((a, b) => a.year - b.year);
      for (const e of sorted) {
        const involvedChars = e.characterIds
          .map((id) => worldData.characters.find((c) => c.id === id)?.name)
          .filter(Boolean)
          .join('、');
        const involvedFactions = e.factionIds
          .map((id) => worldData.factions.find((f) => f.id === id)?.name)
          .filter(Boolean)
          .join('、');
        parts.push(
          `• ${e.year}年《${e.title}》：${e.description}${e.location ? `（${e.location}）` : ''}`
        );
        if (involvedChars) parts.push(`  涉及：${involvedChars}`);
        if (involvedFactions) parts.push(`  势力：${involvedFactions}`);
      }
    } else {
      parts.push(
        `【${startYear}-${endYear}年】这一时期目前没有记录的事件，你可以根据上述势力和人物信息，创作一段精彩的叙事。`
      );
    }

    return parts.join('\n');
  }

  /**
   * 构建关系文本
   */
  private _buildRelationsText(
    character: Character,
    relatedCharacters: Character[],
    relations: Relation[]
  ): string {
    if (relations.length === 0) return '暂无关系记录';

    return relations
      .map((r) => {
        const other = relatedCharacters.find((c) => c.id === r.targetId || c.id === r.sourceId);
        if (!other) return null;
        const typeText: Record<string, string> = {
          盟友: '是盟友',
          宿敌: '是宿敌',
          师徒: '是师徒关系',
          家族: '是家族成员',
          挚友: '是挚友',
          背叛者: '曾是盟友后成为背叛者',
        };
        return `${other.name}（${typeText[r.type] || r.type}）`;
      })
      .filter(Boolean)
      .join('\n');
  }
}

/** 单例导出 */
export const aiService = new AiService();
