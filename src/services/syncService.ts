/**
 * SyncService — 后台 D1 云同步服务
 *
 * 职责：
 * - 检测 Cloudflare Access 认证状态
 * - Debounce 世界数据和编年史变更后异步同步到 D1
 * - 首次加载时从 D1 拉取数据与 localStorage 合并（last-write-wins）
 * - 离线时队列暂存，网络恢复后重试
 *
 * 设计原则：
 * - 所有写操作仍然先同步写入 localStorage（零延迟）
 * - D1 同步是 fire-and-forget，不影响 UI 响应
 * - 高频绘图操作（paintCell/eraseCell）通过 2 秒 debounce 合并
 */
import type { WorldData, ChronicleEntry } from '../types';

const DEVICE_ID_KEY = 'zzworld_device_id';
const LAST_SYNC_KEY = 'zzworld_last_sync';
const DEBOUNCE_DELAY = 2000; // 2 秒

interface CloudResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  updatedAt?: string;
}

class SyncService {
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private pendingFns: Map<string, () => Promise<void>> = new Map();
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private syncEnabled: boolean = false;
  private deviceId: string;
  private lastSyncAt: string | null = null;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.lastSyncAt = this.loadLastSyncTime();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.onOnline());
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /** 检测是否已通过 Cloudflare Access 认证 */
  isAuthenticated(): boolean {
    return document.cookie.includes('CF_Authorization');
  }

  /** 获取当前同步启用状态 */
  isEnabled(): boolean {
    return this.syncEnabled;
  }

  /** 启用/禁用同步（仅在已认证时启用） */
  setEnabled(enabled: boolean): void {
    this.syncEnabled = enabled && this.isAuthenticated();
    if (this.syncEnabled) {
      console.log('[SyncService] 云同步已启用');
    }
  }

  /** 获取上次同步时间 */
  getLastSyncAt(): string | null {
    return this.lastSyncAt;
  }

  /** 获取设备 ID */
  getDeviceId(): string {
    return this.deviceId;
  }

  /** 世界数据变更 → debounce 后同步到 D1 */
  syncWorld(data: WorldData): void {
    if (!this.syncEnabled || !this.isOnline) return;
    this.debounce('world', () => this.postWorld(data));
  }

  /** 编年史变更 → debounce 后同步到 D1 */
  syncChronicles(entries: ChronicleEntry[]): void {
    if (!this.syncEnabled || !this.isOnline) return;
    this.debounce('chronicles', () => this.postChronicles(entries));
  }

  /** 从 D1 拉取数据（首次打开新设备 / 手动同步） */
  async pullFromCloud(): Promise<{
    world: { data: WorldData; updatedAt: string } | null;
    chronicles: { data: ChronicleEntry[]; updatedAt: string } | null;
  }> {
    const [worldResult, chroniclesResult] = await Promise.all([
      this.fetchWorld(),
      this.fetchChronicles(),
    ]);

    return {
      world: worldResult,
      chronicles: chroniclesResult,
    };
  }

  /**
   * 初始同步：合并 D1 和 localStorage 数据
   * 策略：last-write-wins（比较 updatedAt 时间戳）
   * 返回需要写入 store 的数据（如果有）
   */
  async initialSync(localWorld: WorldData | null): Promise<{
    world?: WorldData;
    chronicles?: ChronicleEntry[];
  }> {
    if (!this.isAuthenticated()) {
      console.log('[SyncService] 未认证，跳过云同步');
      return {};
    }

    this.syncEnabled = true;

    try {
      const cloud = await this.pullFromCloud();
      const result: { world?: WorldData; chronicles?: ChronicleEntry[] } = {};

      // ─── 世界数据合并 ───
      const localUpdatedAt = localWorld?.meta?.updatedAt ?? '';
      const cloudUpdatedAt = cloud.world?.updatedAt ?? '';

      if (cloud.world && !localWorld) {
        // 本地无数据，直接用云端
        console.log('[SyncService] 本地无数据，从云端恢复');
        result.world = cloud.world.data;
      } else if (cloud.world && localWorld) {
        // 两边都有数据，比较时间戳
        if (cloudUpdatedAt > localUpdatedAt) {
          console.log('[SyncService] 云端数据更新，使用云端版本');
          result.world = cloud.world.data;
        } else if (localUpdatedAt > cloudUpdatedAt) {
          console.log('[SyncService] 本地数据更新，推送到云端');
          this.syncWorld(localWorld);
        } else {
          console.log('[SyncService] 数据已同步');
        }
      } else if (localWorld && !cloud.world) {
        // 云端无数据，推送本地
        console.log('[SyncService] 云端无数据，推送本地数据');
        this.syncWorld(localWorld);
      }

      // ─── 编年史合并 ───
      if (cloud.chronicles) {
        const localChronicles = this.loadLocalChronicles();
        const cloudChroniclesUpdatedAt = cloud.chronicles.updatedAt;

        if (localChronicles.length === 0) {
          // 本地无编年史，直接用云端
          console.log('[SyncService] 本地无编年史，从云端恢复');
          result.chronicles = cloud.chronicles.data;
        } else {
          // 两边都有，比较条目数量决定策略（编年史没有精确的 updatedAt）
          // 安全策略：合并去重，而非覆盖
          console.log(`[SyncService] 本地 ${localChronicles.length} 条，云端 ${cloud.chronicles.data.length} 条编年史`);
          // 使用合并策略：以本地为主，补充云端中本地没有的条目
          const localIds = new Set(localChronicles.map((c: ChronicleEntry) => c.id));
          const merged = [
            ...localChronicles,
            ...cloud.chronicles.data.filter((c: ChronicleEntry) => !localIds.has(c.id)),
          ];
          if (merged.length !== localChronicles.length) {
            console.log(`[SyncService] 合并编年史：本地 ${localChronicles.length} + 新增 ${merged.length - localChronicles.length} 条`);
            result.chronicles = merged;
          }
        }
      }

      // 推送本地编年史（如果云端没有）
      if (!cloud.chronicles) {
        const localChronicles = this.loadLocalChronicles();
        if (localChronicles.length > 0) {
          this.syncChronicles(localChronicles);
        }
      }

      this.markSyncTime();
      return result;
    } catch (error) {
      console.warn('[SyncService] 初始同步失败，使用本地数据:', error);
      return {};
    }
  }

  /** 立即强制推送当前数据到 D1（手动同步用） */
  async forceSyncWorld(data: WorldData): Promise<boolean> {
    if (!this.syncEnabled) return false;
    try {
      await this.postWorld(data);
      this.markSyncTime();
      return true;
    } catch {
      return false;
    }
  }

  /** 立即强制推送编年史到 D1 */
  async forceSyncChronicles(entries: ChronicleEntry[]): Promise<boolean> {
    if (!this.syncEnabled) return false;
    try {
      await this.postChronicles(entries);
      this.markSyncTime();
      return true;
    } catch {
      return false;
    }
  }

  // ─── Private Methods ───────────────────────────────────────────────────────

  /** Debounce 一个操作：合并高频调用 */
  private debounce(key: string, fn: () => Promise<void>): void {
    // 清除旧定时器
    const existing = this.debounceTimers.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    // 保存最新的操作函数
    this.pendingFns.set(key, fn);

    // 设置新定时器
    this.debounceTimers.set(key, setTimeout(() => {
      this.debounceTimers.delete(key);
      const pending = this.pendingFns.get(key);
      if (pending) {
        this.pendingFns.delete(key);
        pending().catch((err) => {
          console.warn(`[SyncService] ${key} 同步失败:`, err);
          // 保存失败的操作，网络恢复后重试
          this.pendingFns.set(key, pending);
        });
      }
    }, DEBOUNCE_DELAY));
  }

  /** POST 世界数据到 D1 */
  private async postWorld(data: WorldData): Promise<void> {
    const response = await fetch('/api/world', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data,
        updatedAt: data.meta.updatedAt,
      }),
    });

    if (!response.ok) {
      throw new Error(`POST /api/world failed: ${response.status}`);
    }

    const result = await response.json() as CloudResponse<unknown>;
    if (!result.ok) {
      throw new Error(result.error ?? 'Unknown error');
    }

    this.markSyncTime();
    console.log('[SyncService] 世界数据已同步');
  }

  /** POST 编年史到 D1 */
  private async postChronicles(entries: ChronicleEntry[]): Promise<void> {
    const response = await fetch('/api/chronicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: entries,
        updatedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`POST /api/chronicles failed: ${response.status}`);
    }

    const result = await response.json() as CloudResponse<unknown>;
    if (!result.ok) {
      throw new Error(result.error ?? 'Unknown error');
    }

    this.markSyncTime();
    console.log('[SyncService] 编年史已同步');
  }

  /** GET 世界数据从 D1 */
  private async fetchWorld(): Promise<{ data: WorldData; updatedAt: string } | null> {
    try {
      const response = await fetch('/api/world');
      if (response.status === 401) {
        this.syncEnabled = false;
        return null;
      }
      if (!response.ok) {
        throw new Error(`GET /api/world failed: ${response.status}`);
      }
      const result = await response.json() as { world: WorldData | null; updatedAt?: string };
      if (!result.world) return null;
      return { data: result.world, updatedAt: result.updatedAt ?? '' };
    } catch (error) {
      console.warn('[SyncService] 拉取世界数据失败:', error);
      return null;
    }
  }

  /** GET 编年史从 D1 */
  private async fetchChronicles(): Promise<{ data: ChronicleEntry[]; updatedAt: string } | null> {
    try {
      const response = await fetch('/api/chronicles');
      if (response.status === 401) {
        this.syncEnabled = false;
        return null;
      }
      if (!response.ok) {
        throw new Error(`GET /api/chronicles failed: ${response.status}`);
      }
      const result = await response.json() as { chronicles: ChronicleEntry[] | null; updatedAt?: string };
      if (!result.chronicles) return null;
      return { data: result.chronicles, updatedAt: result.updatedAt ?? '' };
    } catch (error) {
      console.warn('[SyncService] 拉取编年史失败:', error);
      return null;
    }
  }

  /** 网络恢复后重试待处理的操作 */
  private onOnline(): void {
    this.isOnline = true;
    console.log('[SyncService] 网络恢复，重试待处理同步');
    for (const [key, fn] of this.pendingFns) {
      this.pendingFns.delete(key);
      fn().catch((err) => {
        console.warn(`[SyncService] 重试 ${key} 失败:`, err);
        this.pendingFns.set(key, fn);
      });
    }
  }

  /** 获取或创建设备 ID */
  private getOrCreateDeviceId(): string {
    try {
      let id = localStorage.getItem(DEVICE_ID_KEY);
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(DEVICE_ID_KEY, id);
      }
      return id;
    } catch {
      return 'unknown-device';
    }
  }

  /** 记录同步时间 */
  private markSyncTime(): void {
    const now = new Date().toISOString();
    this.lastSyncAt = now;
    try {
      localStorage.setItem(LAST_SYNC_KEY, now);
    } catch {
      // ignore
    }
  }

  /** 加载上次同步时间 */
  private loadLastSyncTime(): string | null {
    try {
      return localStorage.getItem(LAST_SYNC_KEY);
    } catch {
      return null;
    }
  }

  /** 读取本地编年史数据 */
  private loadLocalChronicles(): ChronicleEntry[] {
    try {
      const raw = localStorage.getItem('zzworld_chronicles');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed?.entries && Array.isArray(parsed.entries)) return parsed.entries;
      return [];
    } catch {
      return [];
    }
  }
}

/** 单例导出 */
export const syncService = new SyncService();
