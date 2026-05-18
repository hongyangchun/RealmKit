/**
 * Import / Export Service
 * 支持两种格式：
 *   v1（旧格式）：纯 WorldData JSON
 *   v2（全量备份）：FullBackup（含 AI 配置 + 编年史）
 */
import type { WorldData, FullBackup, AiConfig, ChronicleEntry } from '../types';

const AI_CONFIG_KEY = 'zzworld_ai_config';
const CHRONICLES_KEY = 'zzworld_chronicles';

export class ImportExportService {
  // ─── 导出 ─────────────────────────────────────────────────────────────

  /**
   * 导出世界数据为 JSON 文件（v1 格式，向后兼容）
   */
  exportToJson(data: WorldData): void {
    const json = JSON.stringify(data, null, 2);
    this.downloadJson(json, this.makeFilename(data.meta.name, 'world'));
  }

  /**
   * 导出完整备份（v2 格式：世界数据 + AI 配置 + 编年史）
   */
  exportFullBackup(worldData: WorldData): void {
    const backup: FullBackup = {
      version: 2,
      exportedAt: new Date().toISOString(),
      world: worldData,
      aiConfig: this.readFromStorage<AiConfig>(AI_CONFIG_KEY),
      chronicles: this.readFromStorage<ChronicleEntry[]>(CHRONICLES_KEY),
    };
    const json = JSON.stringify(backup, null, 2);
    this.downloadJson(json, this.makeFilename(worldData.meta.name, 'backup'));
  }

  // ─── 导入 ─────────────────────────────────────────────────────────────

  /**
   * 从 File 对象读取并智能导入（自动检测 v1/v2 格式）
   * 返回 WorldData + 可选的附加数据
   */
  async importFromFile(file: File): Promise<ImportResult> {
    const raw = await this.readFileAsText(file);
    const data = JSON.parse(raw) as unknown;

    // 检测是否为 v2 全量备份
    if (this.isFullBackup(data)) {
      const backup = data as FullBackup;
      if (!this.validateWorldData(backup.world)) {
        throw new Error('备份文件中的世界数据格式不正确');
      }
      return {
        world: backup.world,
        aiConfig: backup.aiConfig,
        chronicles: backup.chronicles,
        isFullBackup: true,
        exportedAt: backup.exportedAt,
      };
    }

    // v1 格式：纯 WorldData
    if (!this.validateWorldData(data)) {
      throw new Error('文件格式不正确，请选择有效的世界圣典导出文件');
    }
    return {
      world: data as WorldData,
      isFullBackup: false,
    };
  }

  /**
   * 恢复全量备份中的附加数据（AI 配置 + 编年史）
   */
  restoreExtras(result: ImportResult): void {
    if (result.aiConfig) {
      try {
        localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(result.aiConfig));
      } catch {
        console.warn('[ImportExport] Failed to restore AI config');
      }
    }
    if (result.chronicles && result.chronicles.length > 0) {
      try {
        localStorage.setItem(CHRONICLES_KEY, JSON.stringify(result.chronicles));
      } catch {
        console.warn('[ImportExport] Failed to restore chronicles');
      }
    }
  }

  // ─── 验证 ─────────────────────────────────────────────────────────────

  /**
   * 验证 WorldData schema 基本结构
   */
  validateWorldData(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      typeof d.meta === 'object' &&
      Array.isArray(d.factions) &&
      Array.isArray(d.characters) &&
      Array.isArray(d.cities) &&
      Array.isArray(d.relations) &&
      Array.isArray(d.events) &&
      Array.isArray(d.mapPins) &&
      Array.isArray(d.eras)
    );
  }

  /**
   * 保留旧方法签名兼容
   */
  validateSchema(data: unknown): boolean {
    return this.validateWorldData(data);
  }

  /**
   * 保留旧方法签名兼容（仅导入 WorldData）
   */
  async importFromJson(file: File): Promise<WorldData> {
    const result = await this.importFromFile(file);
    return result.world;
  }

  // ─── 私有工具方法 ─────────────────────────────────────────────────────

  private isFullBackup(data: unknown): data is FullBackup {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return d.version === 2 && typeof d.world === 'object';
  }

  private readFromStorage<T>(key: string): T | undefined {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : undefined;
    } catch {
      return undefined;
    }
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('文件读取失败'));
        }
      };
      reader.onerror = () => reject(new Error('文件读取错误'));
      reader.readAsText(file, 'utf-8');
    });
  }

  private downloadJson(json: string, filename: string): void {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private makeFilename(worldName: string, type: string): string {
    const safe = (worldName || 'world').replace(/[\\/:*?"<>|]/g, '_');
    return `zzworld_${type}_${safe}_${Date.now()}.json`;
  }
}

/** 导入结果 */
export interface ImportResult {
  world: WorldData;
  aiConfig?: AiConfig;
  chronicles?: ChronicleEntry[];
  isFullBackup: boolean;
  exportedAt?: string;
}

/** 单例导出 */
export const importExportService = new ImportExportService();
