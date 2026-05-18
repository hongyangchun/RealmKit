// =============================================================================
// 「世界圣典」全局 TypeScript 类型定义
// =============================================================================

import { RELATION_TYPES } from '../constants/relationTypes';

/** 世界元数据 */
export interface WorldMeta {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

/** 势力/国家 */
export interface Faction {
  id: string;
  name: string;
  color: string;
  description: string;
  foundedYear?: number;
  dissolvedYear?: number;
}

/** 人物技能 */
export interface Skill {
  name: string;
  description: string;
  type: 'active' | 'passive' | 'special';
}

/** 历史人物 */
export interface Character {
  id: string;
  name: string;
  factionId: string;
  avatar?: string;
  birthYear?: number;
  deathYear?: number;
  title?: string;
  skills: Skill[];
  traits: string[];
  bio: string;
  relatedEventIds: string[];
}

/** 人物关系 */
export interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  type: typeof RELATION_TYPES[number];
  description?: string;
}

/** 历史事件 */
export interface HistoryEvent {
  id: string;
  title: string;
  year: number;
  month?: number;
  factionIds: string[];
  characterIds: string[];
  location?: string;
  cityId?: string;              // 关联城市
  description: string;
  tags: string[];
}

/** 城市 */
export interface City {
  id: string;
  name: string;
  factionId: string;           // 所属势力
  gridX: number;               // 网格列位置
  gridY: number;               // 网格行位置
  population?: number;
  description?: string;
  isCapital?: boolean;
  type: 'capital' | 'fortress' | 'port' | 'village' | 'holy_site';
  eventIds: string[];          // 关联事件
}

/** 地图标注（通用自由标注） */
export interface MapPin {
  id: string;
  x: number;
  y: number;
  label: string;
  description?: string;
  factionId?: string;
}

// =============================================================================
// 像素网格绘制类型定义
// =============================================================================

/** 图层ID枚举 */
export type LayerId = 'territory' | 'city' | 'terrain' | 'event' | 'pin';

/** 图层配置 */
export interface MapLayer {
  id: LayerId;
  name: string;
  visible: boolean;
  opacity: number; // 0-1
  color?: string; // 图层默认颜色
  isReadOnly?: boolean; // pin层只读
}

/** 单个网格格子 */
export interface GridCell {
  x: number; // 网格列索引
  y: number; // 网格行索引
  color: string; // 填充颜色
  layerId: LayerId; // 属于哪个图层
  terrain?: string; // 地形类型（terrain 图层使用）
  factionId?: string; // 所属势力 ID（territory 图层使用）
}

/** 网格绘制数据 */
export interface MapGrid {
  width: number; // 网格列数
  height: number; // 网格行数
  cellSize: number; // 每个格子像素大小
  cells: Record<string, GridCell>; // key: "x,y"，所有非空白格子
}

/** 绘制工具类型 */
export type DrawingTool = 'brush' | 'eraser' | 'pan' | 'pin' | 'city';

/** 绘制状态 */
export interface DrawingState {
  tool: DrawingTool;
  color: string;
  activeLayerId: LayerId;
}

/** 撤销/重做历史记录项 */
export interface HistoryEntry {
  type: 'paint' | 'erase';
  layerId: LayerId;
  cells: GridCell[];
  previousCells: Record<string, GridCell>; // 撤销时恢复
}

// =============================================================================

/** 完整世界数据 */
export interface WorldData {
  meta: WorldMeta;
  factions: Faction[];
  characters: Character[];
  relations: Relation[];
  events: HistoryEvent[];
  mapPins: MapPin[];
  cities: City[];
  mapImage?: string;
  eras: string[];
  // 网格绘制数据
  mapGrid?: MapGrid;
  mapLayers?: MapLayer[];
}

/** 冲突检测结果 */
export interface ConflictWarning {
  characterId: string;
  eventId: string;
  type: 'death_violation' | 'location_conflict';
  message: string;
  severity: 'warning' | 'error';
}

/** 全局搜索结果 */
export interface SearchResult {
  type: 'character' | 'event' | 'mapPin' | 'faction' | 'city';
  id: string;
  label: string;
  highlight: string;
  path: string;
}

/** 存储适配器接口（预留 D1 接口） */
export interface IStorageAdapter {
  load(): WorldData | null;
  save(data: WorldData): void;
  clear(): void;
}

// =============================================================================
// AI 配置类型定义
// =============================================================================

/** AI 配置（独立 localStorage 存储） */
export interface AiConfig {
  apiEndpoint: string;      // API 地址，如 https://api.openai.com/v1/chat/completions
  apiKey: string;          // API 密钥
  modelName: string;       // 模型名称，如 gpt-4o
  maxTokens?: number;      // 最大 token 数，默认 2000
}

// =============================================================================
// 世界编年史类型定义
// =============================================================================

/** 编年史条目（史书） */
export interface ChronicleEntry {
  id: string;
  title: string;           // 自动生成标题，如"第一纪元·开元记"
  startYear: number;       // 编年范围起始年
  endYear: number;         // 编年范围结束年
  content: string;          // AI 生成的叙事文字
  createdAt: string;       // 创建时间 ISO 字符串
}

/** 编年史列表（用于 localStorage 存储） */
export interface ChronicleList {
  entries: ChronicleEntry[];
}

// =============================================================================
// 世界种子生成器类型定义
// =============================================================================

/** 世界风格 */
export type WorldStyle = 'fantasy' | 'oriental' | 'war' | 'scifi';

/** 地形类型 */
export type TerrainType = 'continent' | 'archipelago' | 'desert' | 'tundra';

/** 地形格子类型枚举（参考 Polytopia 风格） */
export type TerrainTileType =
  | 'deepOcean'    // 深海
  | 'shallowWater' // 浅水
  | 'beach'        // 沙滩
  | 'grassland'    // 草地
  | 'forest'       // 森林
  | 'hill'         // 丘陵
  | 'mountain'     // 山地
  | 'snowPeak'     // 雪峰
  | 'desert';      // 沙漠

/** 地形颜色配置 (Polytopia 风格) */
export const TERRAIN_COLORS: Record<TerrainTileType, string> = {
  deepOcean: '#1a5276',
  shallowWater: '#2980b9',
  beach: '#f0d9b5',
  grassland: '#52be80',
  forest: '#1e8449',
  hill: '#a67c52',
  mountain: '#7b7b7b',
  snowPeak: '#ecf0f1',
  desert: '#f4d03f',
};

/** 地形格子数据 */
export interface TerrainCell {
  x: number;
  y: number;
  terrainType: TerrainTileType;
  color: string;
}

/** 领地格子数据 */
export interface TerritoryCell {
  x: number;
  y: number;
  color: string;
  factionIndex: number;
  isBorder?: boolean;
}

/** 地图生成选项 */
export interface MapGenOptions {
  width: number;
  height: number;
  terrainType: TerrainType;
  seed?: number;
  waterLevel?: number;
  mountainLevel?: number;
}

/** 地图生成结果 */
export interface MapGenResult {
  terrainCells: TerrainCell[];
  territoryCells: TerritoryCell[];
}

/** 世界种子生成选项 */
export interface WorldSeedOptions {
  factionCount: number;    // 3-6
  style: WorldStyle;
  terrain: TerrainType;
  skipFactions: boolean;
  skipCharacters: boolean;
  skipEvents: boolean;
  mapSeed?: number;
}

/** 世界种子生成结果（未提交到 store） */
export interface WorldSeedResult {
  factions: Omit<Faction, 'id'>[];
  characters: Omit<Character, 'id'>[];
  relations: Omit<Relation, 'id'>[];
  events: Omit<HistoryEvent, 'id'>[];
  cities: Omit<City, 'id'>[];
  mapTerritoryCells: TerritoryCell[];
  mapTerrainCells: TerrainCell[];
}

// =============================================================================
// 故事种子类型定义
// =============================================================================

/** 故事种子（由冲突转换而来） */
export interface StorySeedData {
  id: string;
  mysteryTitle: string;
  mysteryPrompt: string;
  characterName: string;
  eventName: string;
  eventType: 'death_violation' | 'location_conflict';
  suggestions: string[];
}

// =============================================================================
// 全量备份类型定义（跨设备迁移）
// =============================================================================

/** 全量备份数据包（version=2 格式） */
export interface FullBackup {
  version: 2;
  exportedAt: string;
  world: WorldData;
  aiConfig?: AiConfig;
  chronicles?: ChronicleEntry[];
}
