/**
 * Import / Export Service
 * JSON 文件导入导出，含 schema 验证
 */
import type { WorldData } from '../types';

export class ImportExportService {
  /**
   * 导出世界数据为 JSON 文件并触发下载
   */
  exportToJson(data: WorldData): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zzworld_export_${(data.meta.name || 'world').replace(/[\\/:*?"<>|]/g, '_')}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * 从 File 对象读取并验证 JSON，返回 WorldData
   */
  async importFromJson(file: File): Promise<WorldData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const raw = e.target?.result;
          if (typeof raw !== 'string') {
            reject(new Error('文件读取失败'));
            return;
          }
          const data = JSON.parse(raw) as unknown;
          if (!this.validateSchema(data)) {
            reject(new Error('文件格式不正确，请选择有效的世界圣典导出文件'));
            return;
          }
          resolve(data as WorldData);
        } catch {
          reject(new Error('JSON 解析失败，请确认文件格式'));
        }
      };
      reader.onerror = () => reject(new Error('文件读取错误'));
      reader.readAsText(file, 'utf-8');
    });
  }

  /**
   * 验证数据 schema 基本结构
   */
  validateSchema(data: unknown): boolean {
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
}

/** 单例导出 */
export const importExportService = new ImportExportService();
