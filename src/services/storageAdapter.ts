/**
 * Storage Adapter
 * 封装 localStorage 读写，预留 D1 接口
 */
import type { WorldData, IStorageAdapter } from '../types';

const STORAGE_KEY = 'zzworld_data';
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB warning threshold

/** localStorage 实现 */
export class LocalStorageAdapter implements IStorageAdapter {
  load(): WorldData | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as WorldData;
    } catch (e) {
      console.error('[StorageAdapter] Failed to load data:', e);
      return null;
    }
  }

  save(data: WorldData): void {
    try {
      const serialized = JSON.stringify(data);
      // Warn if approaching localStorage limits (use byte length, not character length)
      const byteSize = new TextEncoder().encode(serialized).length;
      if (byteSize > MAX_SIZE_BYTES) {
        console.warn(
          '[StorageAdapter] Data size exceeds 5MB, consider compressing images.'
        );
      }
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (e) {
      console.error('[StorageAdapter] Failed to save data:', e);
    }
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/** 单例导出 */
export const storageAdapter = new LocalStorageAdapter();
