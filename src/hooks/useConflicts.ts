/**
 * useConflicts Hook
 * 读取冲突检测结果，提供按角色/事件过滤的工具函数
 */
import { useWorldStore } from '../store/worldStore';
import type { ConflictWarning } from '../types';

export interface ConflictsHook {
  conflicts: ConflictWarning[];
  getConflictsForCharacter: (characterId: string) => ConflictWarning[];
  getConflictsForEvent: (eventId: string) => ConflictWarning[];
  hasConflict: (eventId: string) => boolean;
  totalCount: number;
}

export function useConflicts(): ConflictsHook {
  const conflicts = useWorldStore((s) => s.conflicts);

  const getConflictsForCharacter = (characterId: string) =>
    conflicts.filter((c) => c.characterId === characterId);

  const getConflictsForEvent = (eventId: string) =>
    conflicts.filter((c) => c.eventId === eventId);

  const hasConflict = (eventId: string) =>
    conflicts.some((c) => c.eventId === eventId);

  return {
    conflicts,
    getConflictsForCharacter,
    getConflictsForEvent,
    hasConflict,
    totalCount: conflicts.length,
  };
}
