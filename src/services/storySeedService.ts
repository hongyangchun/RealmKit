/**
 * Story Seed Service
 * 将 ConflictWarning 转换为 StorySeedData（故事种子）
 * 把"时间矛盾"变成"未解之谜"的叙事化呈现
 */
import type { ConflictWarning, WorldData } from '../types';

export interface StorySeedData {
  id: string;
  mysteryTitle: string;
  mysteryPrompt: string;
  characterName: string;
  eventName: string;
  eventType: 'death_violation' | 'location_conflict';
  suggestions: string[];
}

export class StorySeedService {
  /**
   * 将单个 ConflictWarning 转换为 StorySeedData
   */
  toStorySeed(warning: ConflictWarning, data: WorldData): StorySeedData {
    const characterName = data.characters.find((c) => c.id === warning.characterId)?.name ?? '未知人物';
    const eventName = data.events.find((e) => e.id === warning.eventId)?.title ?? '未知事件';
    const event = data.events.find((e) => e.id === warning.eventId);
    const character = data.characters.find((c) => c.id === warning.characterId);

    if (warning.type === 'death_violation') {
      return this.buildDeathSeed(warning, characterName, eventName, character, event);
    }
    return this.buildLocationSeed(warning, characterName, eventName, character, event, data);
  }

  /**
   * 批量转换
   */
  toStorySeeds(warnings: ConflictWarning[], data: WorldData): StorySeedData[] {
    return warnings.map((w) => this.toStorySeed(w, data));
  }

  /**
   * 构建"死亡后出现"类故事种子
   */
  private buildDeathSeed(
    warning: ConflictWarning,
    charName: string,
    eventName: string,
    character: { deathYear?: number } | undefined,
    event: { year?: number; location?: string } | undefined
  ): StorySeedData {
    const deathYear = character?.deathYear ?? 0;
    const eventYear = event?.year ?? 0;
    const location = event?.location ?? '战场';

    const titles = ['亡者归来？', '幽灵之谜', '不死传说', '跨越死亡的阴影', '死而复生'];
    const title = titles[Math.floor(Math.random() * titles.length)];

    const prompts = [
      `${charName}在 ${deathYear} 年的${location}上倒下了……然而 ${eventYear} 年，有人在「${eventName}」中看到了${charName}的身影。这是幽灵？是冒充者？还是${charName}从未真正死去？`,
      `历史记载${charName}已于 ${deathYear} 年离世，但 ${eventYear} 年的「${eventName}」却留下了一个无法解释的痕迹——${charName}的名字赫然在列。难道有人在借${charName}之名行事？`,
      `${deathYear} 年，${charName}的生命似乎走到了尽头。可 ${eventYear} 年之后，关于${charName}的传闻再次在「${eventName}」中出现。死亡的终点，也许是另一个故事的起点……`,
    ];
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];

    const suggestions = [
      '此人假死了——真实身份一直隐藏在暗处',
      '灵魂回归——某种神秘力量将逝者带回人间',
      '同名同姓的后人在继承先辈的意志',
      '这是敌人的阴谋——有人冒充了' + charName + '的身份',
      '不死诅咒——' + charName + '与某种超自然力量达成了交易',
      '时间扭曲——这场事件实际上发生在' + charName + '死亡之前',
    ];

    return {
      id: `${warning.characterId}_${warning.eventId}`,
      mysteryTitle: title,
      mysteryPrompt: prompt,
      characterName: charName,
      eventName,
      eventType: 'death_violation',
      suggestions: this.shuffle(suggestions).slice(0, 3),
    };
  }

  /**
   * 构建"同年异地"类故事种子
   */
  private buildLocationSeed(
    warning: ConflictWarning,
    charName: string,
    eventName: string,
    _character: unknown,
    event: { year?: number; location?: string } | undefined,
    data: WorldData
  ): StorySeedData {
    const year = event?.year ?? 0;

    // 找出该人物在该年的所有事件及地点
    const charEvents = data.events.filter(
      (e) => e.characterIds.includes(warning.characterId) && e.year === year && e.location
    );
    const locations = charEvents.map((e) => e.location!);
    const locationStr = locations.join('与');

    const titles = ['分身之术？', '瞬移之谜', '两地同现', '不可能的旅途', '时间的裂缝'];
    const title = titles[Math.floor(Math.random() * titles.length)];

    const prompts = [
      `${charName}如何在 ${year} 年同时出现在${locationStr}？普通人绝不可能做到这一点——除非${charName}掌握了某种超越常理的力量，或者……这其中隐藏着不为人知的秘密。`,
      `${year} 年，${charName}的名字同时出现在了${locationStr}的记录中。是史官记载有误？是有人代为行事？还是${charName}真的拥有分身之术？`,
      `同一年，同一个${charName}，在${locationStr}——这怎么可能？也许我们看到的"同一个人"背后，藏着两个完全不同的灵魂。`,
    ];
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];

    const suggestions = [
      '分身术——' + charName + '拥有将自身一分为二的能力',
      '传送魔法——' + charName + '掌握了空间跳跃之术',
      '有双胞胎替身——' + charName + '一直安排替身在不同地方',
      '史书记载有误——某个事件的时间或地点被后人弄错了',
      '密道网络——' + charName + '修建了连接各地秘密通道',
      '幻术障眼——' + charName + '利用幻术让自己同时出现在多处',
    ];

    return {
      id: `${warning.characterId}_${warning.eventId}_${warning.type}`,
      mysteryTitle: title,
      mysteryPrompt: prompt,
      characterName: charName,
      eventName,
      eventType: 'location_conflict',
      suggestions: this.shuffle(suggestions).slice(0, 3),
    };
  }

  /**
   * Fisher-Yates 洗牌
   */
  private shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

/** 单例导出 */
export const storySeedService = new StorySeedService();
