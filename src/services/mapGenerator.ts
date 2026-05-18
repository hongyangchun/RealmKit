/**
 * MapGenerator - 游戏风格随机地图生成器
 * 使用 Simplex 噪声生成地形图，基于地形约束生成势力领地
 * 参考《低模之战》(The Battle of Polytopia) 的地图设计风格
 */
import { createNoise2D, NoiseFunction2D } from 'simplex-noise';
import type {
  TerrainType,
  TerrainTileType,
  TerrainCell,
  TerritoryCell,
  MapGenOptions,
  MapGenResult,
} from '../types';
import { TERRAIN_COLORS } from '../types';
import { FACTION_TERRITORY_COLORS } from '../constants/colors';

// =============================================================================
// 势力颜色调色板（最多 6 种）
// =============================================================================
const FACTION_COLORS = [...FACTION_TERRITORY_COLORS];

// =============================================================================
// 地形参数配置
// =============================================================================
interface TerrainParams {
  waterLevel: number;
  shallowWaterLevel: number;
  beachLevel: number;
  hillLevel: number;
  mountainLevel: number;
  snowLevel: number;
  /** 沙漠倾向：将草地转化为沙漠的比例 */
  desertBias: number;
  /** 雪峰倾向：将山地转化为雪峰的比例 */
  snowBias: number;
  /** 噪声频率：越高地形越破碎（群岛需要高频率） */
  noiseFrequency: number;
  /** 噪声 octave 数 */
  noiseOctaves: number;
  /** 岛屿遮罩边缘锐度：越小边缘越缓，岛越分散 */
  maskEdge: number;
}

const TERRAIN_PARAMS: Record<TerrainType, TerrainParams> = {
  // 大陆：大面积陆地，经典陆地+海洋分布
  continent: {
    waterLevel: 0.35,
    shallowWaterLevel: 0.28,
    beachLevel: 0.38,
    hillLevel: 0.60,
    mountainLevel: 0.75,
    snowLevel: 0.88,
    desertBias: 0,
    snowBias: 0,
    noiseFrequency: 0.02,
    noiseOctaves: 4,
    maskEdge: 0.9,
  },
  // 群岛：大量水域，稀疏的小岛
  archipelago: {
    waterLevel: 0.55,
    shallowWaterLevel: 0.48,
    beachLevel: 0.57,
    hillLevel: 0.72,
    mountainLevel: 0.82,
    snowLevel: 0.92,
    desertBias: 0,
    snowBias: 0,
    noiseFrequency: 0.045,  // 高频率 → 更破碎的地形
    noiseOctaves: 5,
    maskEdge: 1.1,          // 更陡的边缘 → 岛更分散
  },
  // 沙漠：极少的深水，大片沙漠和沙丘，偶见绿洲
  desert: {
    waterLevel: 0.25,
    shallowWaterLevel: 0.20,
    beachLevel: 0.28,
    hillLevel: 0.55,
    mountainLevel: 0.75,
    snowLevel: 0.90,
    desertBias: 0.85,
    snowBias: 0,
    noiseFrequency: 0.025,
    noiseOctaves: 4,
    maskEdge: 0.7,          // 缓边缘 → 陆地向四周延伸更远
  },
  // 冰原：大片雪地和冰川，冰冻海面
  tundra: {
    waterLevel: 0.35,
    shallowWaterLevel: 0.28,
    beachLevel: 0.38,
    hillLevel: 0.52,
    mountainLevel: 0.65,
    snowLevel: 0.72,
    desertBias: 0,
    snowBias: 0.7,
    noiseFrequency: 0.02,
    noiseOctaves: 4,
    maskEdge: 0.85,
  },
};

// =============================================================================
// 工具函数
// =============================================================================

/** 使用 alea 算法的简易种子随机数生成器 */
function createSeededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** 创建可种子的 Simplex 噪声函数 */
function createSeededNoise2D(seed: number): NoiseFunction2D {
  // simplex-noise v4 的 createNoise2D 接受一个随机数生成函数
  const rng = createSeededRandom(seed);
  return createNoise2D(rng);
}

/** 多 octave 噪声采样 */
function fbm(
  noise: NoiseFunction2D,
  x: number,
  y: number,
  octaves: number,
  frequency: number,
  amplitude: number,
  persistence: number,
): number {
  let value = 0;
  let amp = amplitude;
  let freq = frequency;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += noise(x * freq, y * freq) * amp;
    maxValue += amp;
    amp *= persistence;
    freq *= 2;
  }

  return value / maxValue;
}

/** 岛屿遮罩：距离地图中心越远，海拔越低 */
function islandMask(x: number, y: number, width: number, height: number, edgeSharpness: number = 0.9): number {
  const cx = width / 2;
  const cy = height / 2;
  const dx = (x - cx) / cx;
  const dy = (y - cy) / cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // edgeSharpness 控制边缘衰减力度，值越小边缘越缓
  return 1 - Math.pow(dist * edgeSharpness, 2);
}

/** 调整颜色亮度 */
function adjustColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.min(255, Math.max(0, Math.round(r * factor)));
  const ng = Math.min(255, Math.max(0, Math.round(g * factor)));
  const nb = Math.min(255, Math.max(0, Math.round(b * factor)));
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

/** 加深颜色（用于边界） */
function darkenColor(hex: string, amount: number = 0.3): string {
  return adjustColor(hex, 1 - amount);
}

// =============================================================================
// 核心生成器
// =============================================================================

export class MapGenerator {
  /**
   * 生成完整地图（地形 + 领地）
   */
  generateMap(
    options: MapGenOptions,
    factionCount: number = 0,
  ): MapGenResult {
    const terrainCells = this.generateTerrain(options);
    const territoryCells = factionCount > 0
      ? this.generateTerritory(factionCount, terrainCells, options)
      : [];
    return { terrainCells, territoryCells };
  }

  // ---------------------------------------------------------------------------
  // 地形生成
  // ---------------------------------------------------------------------------
  generateTerrain(options: MapGenOptions): TerrainCell[] {
    const { width = 100, height = 100, terrainType, seed } = options;
    const params = TERRAIN_PARAMS[terrainType];
    const actualSeed = seed ?? Math.floor(Math.random() * 2147483647);

    const elevationNoise = createSeededNoise2D(actualSeed);
    const moistureNoise = createSeededNoise2D(actualSeed + 12345);

    const cells: TerrainCell[] = [];
    const rng = createSeededRandom(actualSeed + 99999);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // 海拔：多 octave 噪声 + 岛屿遮罩
        const rawElevation = fbm(elevationNoise, x, y, params.noiseOctaves, params.noiseFrequency, 1, 0.5);
        const mask = islandMask(x, y, width, height, params.maskEdge);
        // 将 [-1,1] 映射到 [0,1] 并应用遮罩
        const elevation = Math.max(0, Math.min(1, (rawElevation + 1) / 2 * mask));

        // 湿度：多 octave 噪声
        const rawMoisture = fbm(moistureNoise, x, y, 3, 0.03, 1, 0.5);
        const moisture = (rawMoisture + 1) / 2; // [0,1]

        // 根据海拔 + 参数确定地形类型
        const terrainType = this.classifyTerrain(elevation, moisture, params, rng);

        // 基础颜色 + 微小亮度变化
        const baseColor = TERRAIN_COLORS[terrainType];
        const brightness = 0.92 + rng() * 0.16; // ±8%
        const color = adjustColor(baseColor, brightness);

        cells.push({ x, y, terrainType, color });
      }
    }

    return cells;
  }

  /**
   * 根据海拔和湿度确定地形类型
   */
  private classifyTerrain(
    elevation: number,
    moisture: number,
    params: TerrainParams,
    rng: () => number,
  ): TerrainTileType {
    // ── 冰原特殊：低海拔浅水区变为雪地（冰冻海面） ──
    if (params.snowBias > 0 && elevation >= params.waterLevel && elevation < params.beachLevel) {
      if (rng() < params.snowBias * 0.6) return 'snowPeak';
    }

    // ── 水域 ──
    if (elevation < params.shallowWaterLevel) {
      // 冰原的深海也冻结
      if (params.snowBias > 0.5 && rng() < params.snowBias * 0.3) return 'snowPeak';
      return 'deepOcean';
    }
    if (elevation < params.waterLevel) {
      if (params.snowBias > 0.5 && rng() < params.snowBias * 0.4) return 'snowPeak';
      return 'shallowWater';
    }
    // ── 沙滩 ──
    if (elevation < params.beachLevel) {
      // 沙漠地形的沙滩直接变沙漠
      if (params.desertBias > 0.5) return 'desert';
      return 'beach';
    }
    // ── 雪峰 ──
    if (elevation >= params.snowLevel) {
      return 'snowPeak';
    }
    // ── 山地 ──
    if (elevation >= params.mountainLevel) {
      if (params.snowBias > 0 && rng() < params.snowBias) {
        return 'snowPeak';
      }
      // 沙漠地形的山地变为沙丘（用 hill 色表示）
      if (params.desertBias > 0.5 && rng() < params.desertBias * 0.5) {
        return 'desert';
      }
      return 'mountain';
    }
    // ── 丘陵 ──
    if (elevation >= params.hillLevel) {
      // 冰原丘陵常被雪覆盖
      if (params.snowBias > 0 && rng() < params.snowBias * 0.6) return 'snowPeak';
      // 沙漠丘陵
      if (params.desertBias > 0.5 && rng() < params.desertBias * 0.7) return 'desert';
      return 'hill';
    }
    // ── 平地 ──
    // 沙漠地形：大部分平地都是沙漠，只在湿度很高处保留绿洲
    if (params.desertBias > 0) {
      // 高湿度 → 绿洲（草地/森林）
      if (moisture > 0.65) return moisture > 0.75 ? 'forest' : 'grassland';
      // 其余全部是沙漠
      if (rng() < params.desertBias) return 'desert';
    }
    // 冰原地形：平地大面积积雪
    if (params.snowBias > 0 && rng() < params.snowBias * 0.4) {
      return 'snowPeak';
    }
    // 通用：根据湿度决定草地/森林
    if (moisture > 0.55) return 'forest';
    if (moisture > 0.35) return 'grassland';
    // 低湿度平地：沙漠地形仍有概率变沙漠
    if (params.desertBias > 0 && rng() < params.desertBias * 0.9) {
      return 'desert';
    }
    return 'grassland';
  }

  // ---------------------------------------------------------------------------
  // 领地生成
  // ---------------------------------------------------------------------------
  generateTerritory(
    factionCount: number,
    terrainCells: TerrainCell[],
    options: MapGenOptions,
  ): TerritoryCell[] {
    const { width = 100, height = 100 } = options;
    const rng = createSeededRandom((options.seed ?? 42) + 77777);

    // 1. 构建地形查找表
    const terrainMap = new Map<string, TerrainCell>();
    for (const tc of terrainCells) {
      terrainMap.set(`${tc.x},${tc.y}`, tc);
    }

    // 2. 找到所有适合放置势力中心的格子
    const validCenters = terrainCells.filter(
      (tc) => tc.terrainType === 'grassland' || tc.terrainType === 'hill',
    );

    if (validCenters.length < factionCount) {
      // 如果有效格子不够，放宽到所有陆地
      const landCells = terrainCells.filter(
        (tc) => tc.terrainType !== 'deepOcean' && tc.terrainType !== 'shallowWater',
      );
      return this.placeTerritories(factionCount, landCells, terrainMap, width, height, rng);
    }

    return this.placeTerritories(factionCount, validCenters, terrainMap, width, height, rng);
  }

  /**
   * 放置势力中心并进行 BFS 扩张
   */
  private placeTerritories(
    factionCount: number,
    candidateCells: TerrainCell[],
    terrainMap: Map<string, TerrainCell>,
    width: number,
    height: number,
    rng: () => number,
  ): TerritoryCell[] {
    if (candidateCells.length === 0) return [];

    // 1. 均匀放置势力中心，保证最小间距
    const centers: Array<{ x: number; y: number }> = [];
    const minDist = 18;
    const maxAttempts = 1000;

    for (let i = 0; i < factionCount; i++) {
      let placed = false;
      for (let attempt = 0; attempt < maxAttempts && !placed; attempt++) {
        const candidate = candidateCells[Math.floor(rng() * candidateCells.length)];
        const tooClose = centers.some(
          (c) => Math.abs(c.x - candidate.x) + Math.abs(c.y - candidate.y) < minDist,
        );
        if (!tooClose) {
          centers.push({ x: candidate.x, y: candidate.y });
          placed = true;
        }
      }
      // 如果多次尝试都失败，放宽距离要求
      if (!placed) {
        const candidate = candidateCells[Math.floor(rng() * candidateCells.length)];
        centers.push({ x: candidate.x, y: candidate.y });
      }
    }

    // 2. BFS 扩张
    const targetSize = Math.floor(
      (candidateCells.length * 0.7) / factionCount,
    ); // 占陆地 70%
    const factionMap = new Map<string, number>(); // "x,y" → factionIndex
    const queue: Array<{ x: number; y: number; factionIdx: number; dist: number }> = [];

    // 初始化队列
    for (let i = 0; i < centers.length; i++) {
      const key = `${centers[i].x},${centers[i].y}`;
      factionMap.set(key, i);
      queue.push({ x: centers[i].x, y: centers[i].y, factionIdx: i, dist: 0 });
    }

    const factionSizes = new Array(centers.length).fill(1);
    const directions = [
      [0, 1], [0, -1], [1, 0], [-1, 0],
    ];

    // BFS 优先扩展距离小的（保证紧凑形状）
    let head = 0;
    while (head < queue.length) {
      const { x, y, factionIdx, dist } = queue[head++];
      if (factionSizes[factionIdx] >= targetSize) continue;

      // 随机打乱方向
      const dirs = [...directions].sort(() => rng() - 0.5);

      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

        const nKey = `${nx},${ny}`;
        if (factionMap.has(nKey)) continue;

        // 检查地形约束
        const terrain = terrainMap.get(nKey);
        if (!terrain) continue;
        if (terrain.terrainType === 'deepOcean') continue;
        if (terrain.terrainType === 'shallowWater' && rng() > 0.15) continue;
        if (terrain.terrainType === 'mountain' && rng() > 0.3) continue;
        if (terrain.terrainType === 'snowPeak' && rng() > 0.15) continue;

        // 扩张
        factionMap.set(nKey, factionIdx);
        factionSizes[factionIdx]++;
        queue.push({ x: nx, y: ny, factionIdx, dist: dist + 1 });
      }
    }

    // 3. 转换为 TerritoryCell 并标记边界
    const cells: TerritoryCell[] = [];
    for (const [key, factionIdx] of factionMap) {
      const [xStr, yStr] = key.split(',');
      const x = parseInt(xStr, 10);
      const y = parseInt(yStr, 10);

      // 检测边界：4 邻域中是否有不同势力
      let isBorder = false;
      for (const [dx, dy] of directions) {
        const nKey = `${x + dx},${y + dy}`;
        const neighbor = factionMap.get(nKey);
        if (neighbor === undefined || neighbor !== factionIdx) {
          isBorder = true;
          break;
        }
      }

      const baseColor = FACTION_COLORS[factionIdx % FACTION_COLORS.length];
      // 边界格加深颜色
      const color = isBorder ? darkenColor(baseColor, 0.3) : baseColor;

      cells.push({ x, y, color, factionIndex: factionIdx, isBorder });
    }

    return cells;
  }
}

/** 单例导出 */
export const mapGenerator = new MapGenerator();
