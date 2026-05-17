/**
 * useChronicles Hook
 * 编年史 CRUD 操作，独立 localStorage 存储（不随世界数据导出）
 * AI 生成内容保存为"史书"，支持查看、删除
 */
import { useState, useCallback, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import type { ChronicleEntry } from '../types';

const STORAGE_KEY = 'zzworld_chronicles';

interface ChroniclesHook {
  chronicles: ChronicleEntry[];
  isLoading: boolean;
  /** 新增一条空编年史记录（供生成后填充） */
  createChronicle: (entry: Omit<ChronicleEntry, 'id'>) => ChronicleEntry;
  /** 更新某条编年史内容 */
  updateChronicle: (id: string, patch: Partial<Omit<ChronicleEntry, 'id'>>) => void;
  /** 删除某条编年史 */
  deleteChronicle: (id: string) => void;
  /** 根据 ID 查找单条记录 */
  getChronicle: (id: string) => ChronicleEntry | undefined;
  /** 清除所有编年史 */
  clearAll: () => void;
}

function loadChronicles(): ChronicleEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed?.entries && Array.isArray(parsed.entries)) return parsed.entries;
    return [];
  } catch {
    return [];
  }
}

function saveChronicles(entries: ChronicleEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    console.warn('[useChronicles] Failed to save to localStorage');
  }
}

export function useChronicles(): ChroniclesHook {
  const [chronicles, setChronicles] = useState<ChronicleEntry[]>(() => loadChronicles());

  // 外部标签页变更同步
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setChronicles(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const createChronicle = useCallback(
    (entry: Omit<ChronicleEntry, 'id'>): ChronicleEntry => {
      const newEntry: ChronicleEntry = { ...entry, id: uuid() };
      setChronicles((prev) => {
        const next = [newEntry, ...prev];
        saveChronicles(next);
        return next;
      });
      return newEntry;
    },
    []
  );

  const updateChronicle = useCallback(
    (id: string, patch: Partial<Omit<ChronicleEntry, 'id'>>) => {
      setChronicles((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
        saveChronicles(next);
        return next;
      });
    },
    []
  );

  const deleteChronicle = useCallback((id: string) => {
    setChronicles((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveChronicles(next);
      return next;
    });
  }, []);

  const getChronicle = useCallback(
    (id: string): ChronicleEntry | undefined => {
      return chronicles.find((c) => c.id === id);
    },
    [chronicles]
  );

  const clearAll = useCallback(() => {
    setChronicles([]);
    saveChronicles([]);
  }, []);

  return { chronicles, isLoading: false, createChronicle, updateChronicle, deleteChronicle, getChronicle, clearAll };
}
