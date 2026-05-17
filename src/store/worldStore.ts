/**
 * World Store (Zustand)
 * 单一数据源，包含所有 CRUD actions，每次变更后自动持久化
 */
import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type {
  WorldData,
  WorldMeta,
  Character,
  Faction,
  City,
  Relation,
  HistoryEvent,
  MapPin,
  ConflictWarning,
  MapLayer,
  MapGrid,
  GridCell,
  LayerId,
  DrawingTool,
  HistoryEntry,
  WorldSeedResult,
} from '../types';
import { storageAdapter } from '../services/storageAdapter';
import { conflictDetector } from '../services/conflictDetector';
import { generateAvatar } from '../components/character/AvatarGenerator';

// ─── Default Data ─────────────────────────────────────────────────────────────

const DEFAULT_META: WorldMeta = {
  id: uuid(),
  name: '我的架空世界',
  description: '一个宏大的架空历史世界',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const DEFAULT_LAYERS: MapLayer[] = [
  { id: 'terrain', name: '地形层', visible: true, opacity: 0.2 },
  { id: 'territory', name: '领土层', visible: true, opacity: 1, color: '#1a237e' },
  { id: 'city', name: '城市层', visible: true, opacity: 0.8, color: '#8B4513' },
  { id: 'event', name: '事件层', visible: true, opacity: 0.7, color: '#C0392B' },
  { id: 'pin', name: '图钉层', visible: true, opacity: 1, isReadOnly: true },
];

const DEFAULT_GRID: MapGrid = {
  width: 100,
  height: 100,
  cellSize: 10,
  cells: {},
};

const DEFAULT_WORLD_DATA: WorldData = {
  meta: DEFAULT_META,
  factions: [],
  characters: [],
  relations: [],
  events: [],
  mapPins: [],
  cities: [],
  mapImage: undefined,
  eras: [],
  mapGrid: DEFAULT_GRID,
  mapLayers: DEFAULT_LAYERS,
};

// ─── Store State & Actions ────────────────────────────────────────────────────

interface WorldStore {
  data: WorldData;
  conflicts: ConflictWarning[];
  isDirty: boolean;

  // ── Drawing State (not persisted) ───────────────────────────────────────────
  drawingTool: DrawingTool;
  drawingColor: string;
  activeLayerId: LayerId;
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];

  // ── Meta ──────────────────────────────────────────────────────────────────
  setWorldMeta: (patch: Partial<WorldMeta>) => void;

  // ── Factions ──────────────────────────────────────────────────────────────
  addFaction: (f: Omit<Faction, 'id'>) => void;
  updateFaction: (id: string, patch: Partial<Faction>) => void;
  deleteFaction: (id: string) => void;

  // ── Characters ────────────────────────────────────────────────────────────
  addCharacter: (c: Omit<Character, 'id'>) => void;
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;

  // ── Relations ──────────────────────────────────────────────────────────────
  addRelation: (r: Omit<Relation, 'id'>) => void;
  updateRelation: (id: string, patch: Partial<Relation>) => void;
  deleteRelation: (id: string) => void;

  // ── Events ────────────────────────────────────────────────────────────────
  addEvent: (e: Omit<HistoryEvent, 'id'>) => string;
  updateEvent: (id: string, patch: Partial<HistoryEvent>) => void;
  deleteEvent: (id: string) => void;

  // ── Map Pins ──────────────────────────────────────────────────────────────
  addMapPin: (p: Omit<MapPin, 'id'>) => void;
  updateMapPin: (id: string, patch: Partial<MapPin>) => void;
  deleteMapPin: (id: string) => void;

  // ── Cities ──────────────────────────────────────────────────────────────
  addCity: (c: Omit<City, 'id'>) => void;
  updateCity: (id: string, patch: Partial<City>) => void;
  deleteCity: (id: string) => void;

  // ── Map Image ─────────────────────────────────────────────────────────────
  setMapImage: (base64: string | undefined) => void;
  clearMapData: () => void;

  // ── Eras ──────────────────────────────────────────────────────────────────
  addEra: (era: string) => void;
  deleteEra: (era: string) => void;

  // ── Map Grid Drawing ──────────────────────────────────────────────────────
  setDrawingTool: (tool: DrawingTool) => void;
  setDrawingColor: (color: string) => void;
  setActiveLayerId: (layerId: LayerId) => void;
  updateLayer: (layerId: LayerId, patch: Partial<MapLayer>) => void;
  paintCell: (x: number, y: number) => void;
  eraseCell: (x: number, y: number) => void;
  clearLayer: (layerId: LayerId) => void;
  undo: () => void;
  redo: () => void;
  initGrid: (width: number, height: number, cellSize: number) => void;
  saveGridData: () => void;

  // ── Import / Export ────────────────────────────────────────────────────────
  importWorld: (data: WorldData) => void;
  exportWorld: () => WorldData;
  applyWorldSeed: (seed: WorldSeedResult) => void;

  // ── Reset ─────────────────────────────────────────────────────────────────
  resetWorld: () => void;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Persist data to localStorage and recompute conflicts */
function persist(data: WorldData): ConflictWarning[] {
  const updated: WorldData = {
    ...data,
    meta: { ...data.meta, updatedAt: new Date().toISOString() },
  };
  storageAdapter.save(updated);
  return conflictDetector.detect(updated);
}

/**
 * 迁移旧格式的 cell key
 * 旧格式: "x,y" → 新格式: "layerId:x,y"
 * 同时迁移 battlefield layerId → event
 */
function migrateCellKeys(data: WorldData): WorldData {
  if (!data.mapGrid?.cells) return data;
  const cells = data.mapGrid.cells;
  const newCells: Record<string, GridCell> = {};
  let migrated = false;

  for (const [key, cell] of Object.entries(cells)) {
    let newKey = key;
    let newCell = cell;

    // Migrate old "x,y" format to "layerId:x,y"
    if (!key.includes(':')) {
      newKey = `${cell.layerId}:${cell.x},${cell.y}`;
      migrated = true;
    }

    // Migrate battlefield → event
    if (cell.layerId === ('battlefield' as string)) {
      newCell = { ...cell, layerId: 'event' };
      if (newKey.includes('battlefield')) {
        newKey = newKey.replace('battlefield', 'event');
      }
      migrated = true;
    }

    newCells[newKey] = newCell;
  }

  // Migrate mapLayers battlefield → event
  let newLayers = data.mapLayers;
  if (data.mapLayers?.some(l => (l.id as string) === 'battlefield')) {
    newLayers = data.mapLayers.map(l =>
      (l.id as string) === 'battlefield'
        ? { ...l, id: 'event' as const, name: '事件层' }
        : l
    );
    migrated = true;
  }

  if (migrated) {
    return {
      ...data,
      mapGrid: { ...data.mapGrid, cells: newCells },
      mapLayers: newLayers,
    };
  }
  return data;
}

const MAX_HISTORY = 50;

// ─── Create Store ─────────────────────────────────────────────────────────────

export const useWorldStore = create<WorldStore>((set, get) => {
  // Initialize from localStorage on first load
  const saved = storageAdapter.load();
  // Merge with defaults to handle missing fields from older data versions
  // Deep merge meta to preserve default values for nested fields
  let initialData: WorldData = saved
    ? {
        ...DEFAULT_WORLD_DATA,
        ...saved,
        meta: { ...DEFAULT_WORLD_DATA.meta, ...saved.meta },
      }
    : DEFAULT_WORLD_DATA;
  // Ensure array fields are always valid arrays
  initialData.factions = initialData.factions ?? [];
  initialData.characters = initialData.characters ?? [];
  initialData.relations = initialData.relations ?? [];
  initialData.events = initialData.events ?? [];
  initialData.mapPins = initialData.mapPins ?? [];
  initialData.cities = initialData.cities ?? [];
  initialData.eras = initialData.eras ?? [];
  // Migrate old cell key format "x,y" → "layerId:x,y"
  initialData = migrateCellKeys(initialData);
  const initialConflicts = conflictDetector.detect(initialData);

  return {
    data: initialData,
    conflicts: initialConflicts,
    isDirty: false,

    // ── Drawing State ────────────────────────────────────────────────────────
    drawingTool: 'brush',
    drawingColor: '#1a237e',
    activeLayerId: 'territory',
    undoStack: [],
    redoStack: [],

    // ── Meta ─────────────────────────────────────────────────────────────────
    setWorldMeta: (patch) =>
      set((s) => {
        const data: WorldData = {
          ...s.data,
          meta: { ...s.data.meta, ...patch },
        };
        const conflicts = persist(data);
        return { data, conflicts, isDirty: false };
      }),

    // ── Factions ─────────────────────────────────────────────────────────────
    addFaction: (f) =>
      set((s) => {
        const newFaction: Faction = { ...f, id: uuid() };
        const data: WorldData = {
          ...s.data,
          factions: [...s.data.factions, newFaction],
        };
        const conflicts = persist(data);
        return { data, conflicts, isDirty: false };
      }),

    updateFaction: (id, patch) =>
      set((s) => {
        const data: WorldData = {
          ...s.data,
          factions: s.data.factions.map((f) =>
            f.id === id ? { ...f, ...patch } : f
          ),
        };
        const conflicts = persist(data);
        return { data, conflicts, isDirty: false };
      }),

    deleteFaction: (id) =>
      set((s) => {
        const data: WorldData = {
          ...s.data,
          factions: s.data.factions.filter((f) => f.id !== id),
        };
        const conflicts = persist(data);
        return { data, conflicts, isDirty: false };
      }),

    // ── Characters ───────────────────────────────────────────────────────────
    addCharacter: (c) =>
      set((s) => {
        const newChar: Character = { ...c, id: uuid() };
        const data: WorldData = {
          ...s.data,
          characters: [...s.data.characters, newChar],
        };
        const conflicts = persist(data);
        return { data, conflicts, isDirty: false };
      }),

    updateCharacter: (id, patch) =>
      set((s) => {
        const data: WorldData = {
          ...s.data,
          characters: s.data.characters.map((c) =>
            c.id === id ? { ...c, ...patch } : c
          ),
        };
        const conflicts = persist(data);
        return { data, conflicts, isDirty: false };
      }),

    deleteCharacter: (id) =>
      set((s) => {
        const data: WorldData = {
          ...s.data,
          characters: s.data.characters.filter((c) => c.id !== id),
          relations: s.data.relations.filter(
            (r) => r.sourceId !== id && r.targetId !== id
          ),
        };
        const conflicts = persist(data);
        return { data, conflicts, isDirty: false };
      }),

    // ── Relations ────────────────────────────────────────────────────────────
    addRelation: (r) =>
      set((s) => {
        const newRelation: Relation = { ...r, id: uuid() };
        const data: WorldData = {
          ...s.data,
          relations: [...s.data.relations, newRelation],
        };
        const conflicts = persist(data);
        return { data, conflicts, isDirty: false };
      }),

    updateRelation: (id, patch) =>
      set((s) => {
        const data: WorldData = {
          ...s.data,
          relations: s.data.relations.map((r) =>
            r.id === id ? { ...r, ...patch } : r
          ),
        };
        const conflicts = persist(data);
        return { data, conflicts, isDirty: false };
      }),

    deleteRelation: (id) =>
      set((s) => {
        const data: WorldData = {
          ...s.data,
          relations: s.data.relations.filter((r) => r.id !== id),
        };
        const conflicts = persist(data);
        return { data, conflicts, isDirty: false };
      }),

    // ── Events ──────────────────────────────────────────────────────────────
    addEvent: (e) => {
      const newId = uuid();
      set((s) => {
        const newEvent: HistoryEvent = { ...e, id: newId };
        const data: WorldData = {
          ...s.data,
          events: [...s.data.events, newEvent],
        };
        const conflicts = persist(data);
        return { data, conflicts, isDirty: false };
      });
      return newId;
    },

    updateEvent: (id, patch) =>
      set((s) => {
        const data: WorldData = {
          ...s.data,
          events: s.data.events.map((e) =>
            e.id === id ? { ...e, ...patch } : e
          ),
        };
        const conflicts = persist(data);
        return { data, conflicts, isDirty: false };
      }),

    deleteEvent: (id) =>
      set((s) => {
        const data: WorldData = {
          ...s.data,
          events: s.data.events.filter((e) => e.id !== id),
        };
        const conflicts = persist(data);
        return { data, conflicts, isDirty: false };
      }),

    // ── Map Pins ─────────────────────────────────────────────────────────────
    addMapPin: (p) =>
      set((s) => {
        const newPin: MapPin = { ...p, id: uuid() };
        const data: WorldData = {
          ...s.data,
          mapPins: [...s.data.mapPins, newPin],
        };
        const conflicts = persist(data);
        return { data, conflicts, isDirty: false };
      }),

    updateMapPin: (id, patch) =>
      set((s) => {
        const data: WorldData = {
          ...s.data,
          mapPins: s.data.mapPins.map((p) =>
            p.id === id ? { ...p, ...patch } : p
          ),
        };
        const conflicts = persist(data);
        return { data, conflicts, isDirty: false };
      }),

    deleteMapPin: (id) =>
      set((s) => {
        const data: WorldData = {
          ...s.data,
          mapPins: s.data.mapPins.filter((p) => p.id !== id),
        };
        const conflicts = persist(data);
        return { data, conflicts, isDirty: false };
      }),

    // ── Cities ───────────────────────────────────────────────────────────────
    addCity: (c) =>
      set((s) => {
        const newCity: City = { ...c, id: uuid() };
        // Auto-paint city-layer cell
        const faction = s.data.factions.find((f) => f.id === c.factionId);
        const grid = s.data.mapGrid ?? DEFAULT_GRID;
        const cellKey = `city:${c.gridX},${c.gridY}`;
        const cityCell: GridCell = {
          x: c.gridX,
          y: c.gridY,
          color: faction?.color ?? '#8B4513',
          layerId: 'city',
        };
        const newGrid = { ...grid, cells: { ...grid.cells, [cellKey]: cityCell } };
        const data: WorldData = {
          ...s.data,
          cities: [...s.data.cities, newCity],
          mapGrid: newGrid,
        };
        const conflicts = persist(data);
        return { data, conflicts, isDirty: false };
      }),

    updateCity: (id, patch) =>
      set((s) => {
        const oldCity = s.data.cities.find((c) => c.id === id);
        const grid = s.data.mapGrid ?? DEFAULT_GRID;
        const newCells = { ...grid.cells };
        // If position changed, move the cell
        if (oldCity && (patch.gridX !== undefined || patch.gridY !== undefined)) {
          const oldKey = `city:${oldCity.gridX},${oldCity.gridY}`;
          delete newCells[oldKey];
        }
        const updated = { ...oldCity, ...patch };
        const faction = s.data.factions.find((f) => f.id === updated.factionId);
        const newKey = `city:${updated.gridX},${updated.gridY}`;
        newCells[newKey] = {
          x: updated.gridX,
          y: updated.gridY,
          color: faction?.color ?? '#8B4513',
          layerId: 'city',
        };
        const newGrid = { ...grid, cells: newCells };
        const data: WorldData = {
          ...s.data,
          cities: s.data.cities.map((c) =>
            c.id === id ? { ...c, ...patch } : c
          ),
          mapGrid: newGrid,
        };
        const conflicts = persist(data);
        return { data, conflicts, isDirty: false };
      }),

    deleteCity: (id) =>
      set((s) => {
        const city = s.data.cities.find((c) => c.id === id);
        const grid = s.data.mapGrid ?? DEFAULT_GRID;
        const newCells = { ...grid.cells };
        if (city) {
          const key = `city:${city.gridX},${city.gridY}`;
          delete newCells[key];
        }
        const newGrid = { ...grid, cells: newCells };
        const data: WorldData = {
          ...s.data,
          cities: s.data.cities.filter((c) => c.id !== id),
          mapGrid: newGrid,
        };
        const conflicts = persist(data);
        return { data, conflicts, isDirty: false };
      }),

    // ── Map Image ────────────────────────────────────────────────────────────
    setMapImage: (base64) =>
      set((s) => {
        const data: WorldData = { ...s.data, mapImage: base64 };
        const conflicts = persist(data);
        return { data, conflicts, isDirty: false };
      }),

    clearMapData: () =>
      set((s) => {
        const data: WorldData = {
          ...s.data,
          mapImage: undefined,
          mapGrid: undefined,
          mapLayers: DEFAULT_LAYERS,
          mapPins: [],
        };
        persist(data);
        return { data, conflicts: get().conflicts, isDirty: false };
      }),

    // ── Eras ─────────────────────────────────────────────────────────────────
    addEra: (era) =>
      set((s) => {
        if (s.data.eras.includes(era)) return s;
        const data: WorldData = { ...s.data, eras: [...s.data.eras, era] };
        const conflicts = persist(data);
        return { data, conflicts, isDirty: false };
      }),

    deleteEra: (era) =>
      set((s) => {
        const data: WorldData = {
          ...s.data,
          eras: s.data.eras.filter((e) => e !== era),
        };
        const conflicts = persist(data);
        return { data, conflicts, isDirty: false };
      }),

    // ── Map Grid Drawing ────────────────────────────────────────────────────
    setDrawingTool: (tool) => set({ drawingTool: tool }),

    setDrawingColor: (color) => set({ drawingColor: color }),

    setActiveLayerId: (layerId) => set({ activeLayerId: layerId }),

    updateLayer: (layerId, patch) =>
      set((s) => {
        const layers = s.data.mapLayers?.map((l) =>
          l.id === layerId ? { ...l, ...patch } : l
        ) ?? DEFAULT_LAYERS;
        const data: WorldData = { ...s.data, mapLayers: layers };
        persist(data);
        return { data };
      }),

    paintCell: (x, y) =>
      set((s) => {
        const { activeLayerId, drawingColor, data } = s;
        const grid = data.mapGrid ?? DEFAULT_GRID;
        const layers = data.mapLayers ?? DEFAULT_LAYERS;
        const activeLayer = layers.find((l) => l.id === activeLayerId);

        // Don't paint on read-only layers
        if (activeLayer?.isReadOnly) return s;

        const key = `${activeLayerId}:${x},${y}`;
        const previousCells: Record<string, GridCell> = {};
        const existingCell = grid.cells[key];

        if (existingCell && existingCell.layerId === activeLayerId) {
          // Same layer, update color
          previousCells[key] = existingCell;
        } else if (existingCell) {
          // Different layer, preserve that cell
          previousCells[key] = existingCell;
        }

        const newCell: GridCell = {
          x,
          y,
          color: drawingColor,
          layerId: activeLayerId,
        };

        const newCells = { ...grid.cells, [key]: newCell };
        const newGrid = { ...grid, cells: newCells };
        const newData = { ...data, mapGrid: newGrid };

        // Add to undo stack
        const historyEntry: HistoryEntry = {
          type: 'paint',
          layerId: activeLayerId,
          cells: [newCell],
          previousCells,
        };

        const undoStack = [...s.undoStack, historyEntry].slice(-MAX_HISTORY);

        persist(newData);
        return { data: newData, undoStack, redoStack: [] };
      }),

    eraseCell: (x, y) =>
      set((s) => {
        const { activeLayerId, data } = s;
        const grid = data.mapGrid ?? DEFAULT_GRID;
        const layers = data.mapLayers ?? DEFAULT_LAYERS;
        const activeLayer = layers.find((l) => l.id === activeLayerId);

        // Don't erase on read-only layers
        if (activeLayer?.isReadOnly) return s;

        const key = `${activeLayerId}:${x},${y}`;
        const existingCell = grid.cells[key];

        if (!existingCell || existingCell.layerId !== activeLayerId) {
          return s; // Nothing to erase
        }

        const previousCells: Record<string, GridCell> = { [key]: existingCell };

        const newCells = { ...grid.cells };
        delete newCells[key];

        const newGrid = { ...grid, cells: newCells };
        const newData = { ...data, mapGrid: newGrid };

        // Add to undo stack
        const historyEntry: HistoryEntry = {
          type: 'erase',
          layerId: activeLayerId,
          cells: [],
          previousCells,
        };

        const undoStack = [...s.undoStack, historyEntry].slice(-MAX_HISTORY);

        persist(newData);
        return { data: newData, undoStack, redoStack: [] };
      }),

    clearLayer: (layerId) =>
      set((s) => {
        const { data } = s;
        const grid = data.mapGrid ?? DEFAULT_GRID;
        const layers = data.mapLayers ?? DEFAULT_LAYERS;
        const layer = layers.find((l) => l.id === layerId);

        // Don't clear read-only layers
        if (layer?.isReadOnly) return s;

        // Collect cells to clear
        const previousCells: Record<string, GridCell> = {};
        const cellsToClear: GridCell[] = [];

        Object.values(grid.cells).forEach((cell) => {
          if (cell.layerId === layerId) {
            previousCells[`${cell.layerId}:${cell.x},${cell.y}`] = cell;
            cellsToClear.push(cell);
          }
        });

        if (cellsToClear.length === 0) return s;

        const newCells = { ...grid.cells };
        cellsToClear.forEach((cell) => {
          delete newCells[`${cell.layerId}:${cell.x},${cell.y}`];
        });

        const newGrid = { ...grid, cells: newCells };
        const newData = { ...data, mapGrid: newGrid };

        const historyEntry: HistoryEntry = {
          type: 'erase',
          layerId,
          cells: [],
          previousCells,
        };

        const undoStack = [...s.undoStack, historyEntry].slice(-MAX_HISTORY);

        persist(newData);
        return { data: newData, undoStack, redoStack: [] };
      }),

    undo: () =>
      set((s) => {
        const { undoStack, data } = s;
        if (undoStack.length === 0) return s;

        const entry = undoStack[undoStack.length - 1];
        const newUndoStack = undoStack.slice(0, -1);

        const grid = data.mapGrid ?? DEFAULT_GRID;
        const newCells = { ...grid.cells };

        // 1) Remove cells that were added/modified by this operation
        entry.cells.forEach((cell) => {
          const key = `${cell.layerId}:${cell.x},${cell.y}`;
          delete newCells[key];
        });

        // For erase operations, also remove cells that were erased
        // (they may have been restored by a previous undo or other means)
        if (entry.type === 'erase') {
          Object.keys(entry.previousCells).forEach((key) => {
            delete newCells[key];
          });
        }

        // 2) Restore previous cells (the state before the operation)
        Object.entries(entry.previousCells).forEach(([key, cell]) => {
          if (cell) {
            newCells[key] = cell;
          } else {
            delete newCells[key];
          }
        });

        const newGrid = { ...grid, cells: newCells };
        const newData = { ...data, mapGrid: newGrid };
        const newRedoStack = [...s.redoStack, entry].slice(-MAX_HISTORY);

        persist(newData);
        return { data: newData, undoStack: newUndoStack, redoStack: newRedoStack };
      }),

    redo: () =>
      set((s) => {
        const { redoStack, data } = s;
        if (redoStack.length === 0) return s;

        const entry = redoStack[redoStack.length - 1];
        const newRedoStack = redoStack.slice(0, -1);

        const grid = data.mapGrid ?? DEFAULT_GRID;
        const newCells = { ...grid.cells };

        // 1) For erase operations, first remove the cells that were erased
        if (entry.type === 'erase') {
          Object.keys(entry.previousCells).forEach((key) => {
            delete newCells[key];
          });
        } else {
          // For paint operations, remove previousCells that were overwritten
          // This handles the edge case where painting overwrote an existing cell
          // with a different value (e.g., changed color)
          Object.keys(entry.previousCells).forEach((key) => {
            delete newCells[key];
          });
        }

        // 2) Re-apply the operation: write the cells that were added/modified
        entry.cells.forEach((cell) => {
          newCells[`${cell.layerId}:${cell.x},${cell.y}`] = cell;
        });

        const newGrid = { ...grid, cells: newCells };
        const newData = { ...data, mapGrid: newGrid };
        const newUndoStack = [...s.undoStack, entry].slice(-MAX_HISTORY);

        persist(newData);
        return { data: newData, undoStack: newUndoStack, redoStack: newRedoStack };
      }),

    initGrid: (width, height, cellSize) =>
      set((s) => {
        const newGrid: MapGrid = {
          width,
          height,
          cellSize,
          cells: {},
        };
        const data: WorldData = { ...s.data, mapGrid: newGrid };
        persist(data);
        return { data };
      }),

    saveGridData: () => {
      const { data } = get();
      persist(data);
    },

    // ── Import / Export ─────────────────────────────────────────────────────
    importWorld: (importedData) =>
      set(() => {
        const conflicts = persist(importedData);
        return { data: importedData, conflicts, isDirty: false };
      }),

    exportWorld: () => {
      return get().data;
    },

    // ── World Seed Generator ────────────────────────────────────────────────
    applyWorldSeed: (seed) =>
      set((s) => {
        // 获取默认的 mapGrid 配置
        const DEFAULT_GRID: MapGrid = {
          width: 100,
          height: 100,
          cellSize: 10,
          cells: {},
        };
        const mapGrid = s.data.mapGrid ?? DEFAULT_GRID;

        // 为所有实体生成唯一 ID
        let idCounter = 0;
        const nextId = () => `seed_${Date.now()}_${idCounter++}`;

        // 处理势力：生成 ID
        const factionsWithIds: Faction[] = seed.factions.map((f) => ({
          ...f,
          id: nextId(),
        }));

        // 建立势力占位 ID -> 真实 ID 的映射（生成端使用 faction_${i} 格式）
        const factionPlaceholderToId: Record<string, string> = {};
        const factionIdToColor: Record<string, string> = {};
        factionsWithIds.forEach((f, i) => {
          factionPlaceholderToId[`faction_${i}`] = f.id;
          factionIdToColor[f.id] = f.color;
        });

        const charactersWithIds: Character[] = seed.characters.map((c) => {
          const realFactionId = factionPlaceholderToId[c.factionId] || c.factionId;
          return {
            ...c,
            id: nextId(),
            factionId: realFactionId,
            avatar: c.avatar || generateAvatar(c.name, factionIdToColor[realFactionId] || '#8B4513'),
          };
        });

        // 建立人物占位 ID -> 真实 ID 的映射（生成端使用 char_${idx} 格式）
        const charPlaceholderToId: Record<string, string> = {};
        charactersWithIds.forEach((c, idx) => {
          charPlaceholderToId[`char_${idx}`] = c.id;
        });

        // 处理关系：转换引用为 ID
        const relationsWithIds: Relation[] = seed.relations.map((r) => ({
          ...r,
          id: nextId(),
          sourceId: charPlaceholderToId[r.sourceId] || r.sourceId,
          targetId: charPlaceholderToId[r.targetId] || r.targetId,
        }));

        // 处理事件：转换势力和人物引用为 ID
        const eventsWithIds: HistoryEvent[] = seed.events.map((e) => {
          const resolvedFactionIds = e.factionIds
            .map((ref) => {
              const resolved = factionPlaceholderToId[ref];
              if (!resolved) {
                console.warn(`[applyWorldSeed] Failed to resolve faction reference: ${ref}`);
              }
              return resolved;
            })
            .filter((id): id is string => id !== undefined);
          const resolvedCharacterIds = e.characterIds
            .map((ref) => {
              const resolved = charPlaceholderToId[ref];
              if (!resolved) {
                console.warn(`[applyWorldSeed] Failed to resolve character reference: ${ref}`);
              }
              return resolved;
            })
            .filter((id): id is string => id !== undefined);
          return {
            ...e,
            id: nextId(),
            factionIds: resolvedFactionIds,
            characterIds: resolvedCharacterIds,
          };
        });

        // 处理城市：转换占位 ID 为真实 ID
        const citiesWithIds: City[] = (seed.cities ?? []).map((c) => ({
          ...c,
          id: nextId(),
          factionId: factionPlaceholderToId[c.factionId] || c.factionId,
          eventIds: c.eventIds ?? [],
        }));

        // 将地形和领地格子数据转换为 GridCell 格式并填充 mapGrid.cells
        const cells: Record<string, GridCell> = {};

        // 写入地形层（新格式 key: "layerId:x,y"）
        if (seed.mapTerrainCells) {
          for (const tc of seed.mapTerrainCells) {
            const key = `terrain:${tc.x},${tc.y}`;
            cells[key] = {
              x: tc.x,
              y: tc.y,
              color: tc.color,
              layerId: 'terrain' as LayerId,
            };
          }
        }

        // 写入领地层
        for (const tc of seed.mapTerritoryCells) {
          const key = `territory:${tc.x},${tc.y}`;
          cells[key] = {
            x: tc.x,
            y: tc.y,
            color: tc.color,
            layerId: 'territory' as LayerId,
          };
        }

        // 写入城市层
        for (const city of citiesWithIds) {
          const key = `city:${city.gridX},${city.gridY}`;
          cells[key] = {
            x: city.gridX,
            y: city.gridY,
            color: factionIdToColor[city.factionId] || '#8B4513',
            layerId: 'city' as LayerId,
          };
        }

        const newGrid = { ...mapGrid, cells };

        // 构建新数据
        const newData: WorldData = {
          ...s.data,
          meta: {
            ...s.data.meta,
            name: '我的架空世界',
            updatedAt: new Date().toISOString(),
          },
          factions: factionsWithIds,
          characters: charactersWithIds,
          relations: relationsWithIds,
          events: eventsWithIds,
          cities: citiesWithIds,
          mapPins: [],
          mapGrid: newGrid,
          mapLayers: [
            { id: 'terrain', name: '地形层', visible: true, opacity: 0.2 },
            { id: 'territory', name: '领土层', visible: true, opacity: 1, color: '#1a237e' },
            { id: 'city', name: '城市层', visible: true, opacity: 0.8, color: '#8B4513' },
            { id: 'event', name: '事件层', visible: true, opacity: 0.7, color: '#C0392B' },
            { id: 'pin', name: '图钉层', visible: true, opacity: 1, isReadOnly: true },
          ],
          eras: [],
        };

        const conflicts = persist(newData);
        return { data: newData, conflicts, isDirty: false };
      }),

    resetWorld: () =>
      set(() => {
        const freshData: WorldData = {
          ...DEFAULT_WORLD_DATA,
          meta: { ...DEFAULT_META, updatedAt: new Date().toISOString() },
        };
        // 先清除旧数据，再保存干净的默认数据
        storageAdapter.clear();
        storageAdapter.save(freshData);
        const conflicts = conflictDetector.detect(freshData);
        return { data: freshData, conflicts, isDirty: false };
      }),
  };
});
