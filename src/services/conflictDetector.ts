/**
 * Conflict Detector Service
 * 检测两类历史冲突：
 * 1. 死亡后出现：character.deathYear < event.year
 * 2. 同年异地矛盾：同一人物同年参与 location 不同的两个事件
 */
import type { WorldData, Character, HistoryEvent, ConflictWarning } from '../types';

export class ConflictDetector {
  /**
   * 对整个世界数据执行完整冲突检测
   */
  detect(data: WorldData): ConflictWarning[] {
    const warnings: ConflictWarning[] = [];
    const characters = data.characters ?? [];
    const events = data.events ?? [];
    for (const character of characters) {
      const charEvents = events.filter((e) =>
        e.characterIds?.includes(character.id)
      );
      warnings.push(...this.detectForCharacter(character, charEvents));
    }
    return warnings;
  }

  /**
   * 对单个人物执行冲突检测
   */
  detectForCharacter(
    char: Character,
    events: HistoryEvent[]
  ): ConflictWarning[] {
    const warnings: ConflictWarning[] = [];
    warnings.push(...this.checkDeathViolation(char, events));
    warnings.push(...this.checkLocationConflict(char, events));
    return warnings;
  }

  /**
   * 检测死亡后仍参与事件
   */
  private checkDeathViolation(
    char: Character,
    events: HistoryEvent[]
  ): ConflictWarning[] {
    if (char.deathYear === undefined || char.deathYear === null) return [];

    return events
      .filter((e) => e.year > char.deathYear!)
      .map((e) => ({
        characterId: char.id,
        eventId: e.id,
        type: 'death_violation' as const,
        message: `${char.name} 已于 ${char.deathYear} 年去世，但仍出现在 ${e.year} 年的「${e.title}」中`,
        severity: 'error' as const,
      }));
  }

  /**
   * 检测同年异地矛盾（同一人物同一年份出现在不同地点）
   */
  private checkLocationConflict(
    char: Character,
    events: HistoryEvent[]
  ): ConflictWarning[] {
    const warnings: ConflictWarning[] = [];

    // Group events by year, filter only those with a location
    const byYear = new Map<number, HistoryEvent[]>();
    for (const e of events) {
      if (e.location && e.location.trim() !== '') {
        const arr = byYear.get(e.year) ?? [];
        arr.push(e);
        byYear.set(e.year, arr);
      }
    }

    for (const [year, yearEvents] of byYear) {
      if (yearEvents.length < 2) continue;
      // Check if there are at least 2 different locations
      const locations = new Set(yearEvents.map((e) => e.location));
      if (locations.size < 2) continue;

      // Every event in this year-group is a conflict
      for (const e of yearEvents) {
        warnings.push({
          characterId: char.id,
          eventId: e.id,
          type: 'location_conflict',
          message: `${char.name} 在 ${year} 年同时出现在不同地点（${Array.from(locations).join('、')}）`,
          severity: 'warning',
        });
      }
    }

    return warnings;
  }
}

/** 单例导出 */
export const conflictDetector = new ConflictDetector();
