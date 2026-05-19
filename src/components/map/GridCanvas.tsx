/**
 * GridCanvas - 像素网格绘制组件
 * 使用 Canvas 进行高性能网格渲染和绘制
 * 支持鼠标平移（拖拽）和滚轮缩放
 */
import React, { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { Box } from '@mui/material';
import { useWorldStore } from '../../store/worldStore';
import { audioManager } from '../../services/audio/AudioManager';
import type { MapLayer, GridCell, LayerId, Faction, City, HistoryEvent } from '../../types';

/**
 * 手动绘制圆角矩形的兼容性辅助函数
 * 替代 ctx.roundRect()，支持所有浏览器
 */
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radii: number | DOMPointInit | Iterable<number>
) {
  // Normalize radii to a single number
  let r: number;
  if (typeof radii === 'number') {
    r = radii;
  } else if (radii instanceof DOMPoint) {
    r = radii.x;
  } else if (Symbol.iterator in Object(radii)) {
    // Take the first value from iterable
    const first = (radii as Iterable<number>)[Symbol.iterator]().next();
    r = first.done ? 0 : first.value;
  } else {
    r = (radii as DOMPointInit).x ?? 0;
  }
  // Clamp radius so it never exceeds half the smallest dimension
  r = Math.max(0, Math.min(r, w / 2, h / 2));

  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** GridCanvas 暴露给父组件的控制接口 */
export interface GridCanvasHandle {
  /** 放大一级 */
  zoomIn: () => void;
  /** 缩小一级 */
  zoomOut: () => void;
  /** 重置到默认缩放和位置 */
  resetView: () => void;
  /** 获取当前缩放级别 */
  getZoom: () => number;
  /** 从屏幕坐标反算网格坐标 */
  hitTest: (clientX: number, clientY: number) => { x: number; y: number } | null;
  /** 获取当前平移、缩放、有效格子大小 */
  getPanZoom: () => { panX: number; panY: number; zoom: number; effectiveCellSize: number; effectiveCellSizeX: number; effectiveCellSizeY: number };
}

interface GridCanvasProps {
  width: number;
  height: number;
  onSizeChange?: (width: number, height: number) => void;
  /** 点击画布时触发（pan/pin/city 工具下），返回屏幕坐标 */
  onCanvasClick?: (clientX: number, clientY: number) => void;
  /** Canvas 重绘后通知父组件平移/缩放状态（effectiveCellSizeX/Y 分别对应 X/Y 方向格子像素大小） */
  onPanZoomChange?: (panX: number, panY: number, zoom: number, effectiveCellSize: number, effectiveCellSizeY?: number) => void;
  /** 鼠标 hover 到势力领地上时触发，factionId 为 null 表示离开领地 */
  onHoverFaction?: (factionId: string | null, screenX: number, screenY: number) => void;
  /** 只读模式：禁止绘制/擦除/放置图钉/放置城市，强制使用平移模式 */
  readOnly?: boolean;
}

// Zoom limits
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.15;

const GridCanvas = forwardRef<GridCanvasHandle, GridCanvasProps>(({ width, height, onSizeChange, onCanvasClick, onPanZoomChange, onHoverFaction, readOnly }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastCell, setLastCell] = useState<{ x: number; y: number } | null>(null);

  // Pan & zoom state stored in refs to avoid re-renders on every frame
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  // Track whether we are panning (middle-click or pan tool drag)
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panStartOffsetRef = useRef({ x: 0, y: 0 });
  // Space key held down — enables pan mode even with left click
  const spaceHeldRef = useRef(false);

  // Click-detection state: distinguish click from drag (for pan/pin tool)
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  // Track last hovered faction to avoid redundant callbacks
  const lastHoveredFactionRef = useRef<string | null>(null);

  // Track hovered cell for brush preview cursor
  const hoveredCellRef = useRef<{ x: number; y: number } | null>(null);

  // Track hover rendering with rAF throttling to avoid full redraw per mousemove
  const hoverRafRef = useRef<number>(0);

  // Track default centered pan for resetView
  const defaultCenterRef = useRef({ x: 0, y: 0 });
  // Flag: has initial center been computed?
  const hasInitializedRef = useRef(false);

  // ─── Expose zoom/pan control to parent ──────────────────────────────────
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const oldZoom = zoomRef.current;
      const newZoom = Math.min(MAX_ZOOM, oldZoom * (1 + ZOOM_STEP));
      if (newZoom === oldZoom) return;
      // Zoom centered on canvas center (CSS pixels)
      const cx = width / 2;
      const cy = height / 2;
      panRef.current = {
        x: cx - (cx - panRef.current.x) * (newZoom / oldZoom),
        y: cy - (cy - panRef.current.y) * (newZoom / oldZoom),
      };
      zoomRef.current = newZoom;
      renderCanvas();
    },
    zoomOut: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const oldZoom = zoomRef.current;
      const newZoom = Math.max(MIN_ZOOM, oldZoom * (1 - ZOOM_STEP));
      if (newZoom === oldZoom) return;
      const cx = width / 2;
      const cy = height / 2;
      panRef.current = {
        x: cx - (cx - panRef.current.x) * (newZoom / oldZoom),
        y: cy - (cy - panRef.current.y) * (newZoom / oldZoom),
      };
      zoomRef.current = newZoom;
      renderCanvas();
    },
    resetView: () => {
      zoomRef.current = 1;
      panRef.current = { ...defaultCenterRef.current };
      renderCanvas();
    },
    getZoom: () => zoomRef.current,
    getPanZoom: () => {
      const grid = mapGrid ?? { width: 0, height: 0 };
      const logicalW = grid.width * cellSize;
      const logicalH = grid.height * cellSize;
      const scaleX = width / (logicalW || 1);
      const scaleY = height / (logicalH || 1);
      const effectiveCellSizeX = cellSize * scaleX;
      const effectiveCellSizeY = cellSize * scaleY;
      return {
        panX: panRef.current.x,
        panY: panRef.current.y,
        zoom: zoomRef.current,
        effectiveCellSize: effectiveCellSizeX, // 兼容旧接口
        effectiveCellSizeX,
        effectiveCellSizeY,
      };
    },
    hitTest: (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const cssX = clientX - rect.left;
      const cssY = clientY - rect.top;

      const zoom = zoomRef.current;
      const pan = panRef.current;

      const logicalX = (cssX - pan.x) / zoom;
      const logicalY = (cssY - pan.y) / zoom;

      const grid = mapGrid ?? { width: 0, height: 0 };
      const logicalW = grid.width * cellSize;
      const logicalH = grid.height * cellSize;
      const scaleX = width / (logicalW || 1);
      const scaleY = height / (logicalH || 1);
      const effectiveCellSizeX = cellSize * scaleX;
      const effectiveCellSizeY = cellSize * scaleY;

      const x = Math.floor(logicalX / effectiveCellSizeX);
      const y = Math.floor(logicalY / effectiveCellSizeY);

      if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return null;
      return { x, y };
    },
  }));

  const mapGrid = useWorldStore((s) => s.data.mapGrid);
  const mapLayers = useWorldStore((s) => s.data.mapLayers ?? []);
  const factions = useWorldStore((s) => s.data.factions);
  const cities = useWorldStore((s) => s.data.cities);
  const events = useWorldStore((s) => s.data.events);
  const drawingTool = useWorldStore((s) => s.drawingTool);
  const activeLayerId = useWorldStore((s) => s.activeLayerId);
  const brushSize = useWorldStore((s) => s.brushSize);
  const paintCell = useWorldStore((s) => s.paintCell);
  const eraseCell = useWorldStore((s) => s.eraseCell);
  const initGrid = useWorldStore((s) => s.initGrid);

  const cellSize = mapGrid?.cellSize ?? 10;

  // Keep latest drawingTool/brushSize/readOnly in refs so renderCanvas (useCallback)
  // can read them without needing to be recreated on every change.
  const drawingToolRef = useRef(drawingTool);
  drawingToolRef.current = drawingTool;
  const brushSizeRef = useRef(brushSize);
  brushSizeRef.current = brushSize;
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;

  // Initialize grid when container size changes
  useEffect(() => {
    if (width > 0 && height > 0) {
      const gridWidth = Math.floor(width / cellSize);
      const gridHeight = Math.floor(height / cellSize);
      if (onSizeChange) {
        onSizeChange(mapGrid?.width ?? gridWidth, mapGrid?.height ?? gridHeight);
      }
      const hasExistingData = mapGrid && Object.keys(mapGrid.cells).length > 0;
      if (!mapGrid || (!hasExistingData && (mapGrid.width !== gridWidth || mapGrid.height !== gridHeight))) {
        initGrid(gridWidth, gridHeight, cellSize);
      }
    }
  }, [width, height, cellSize, mapGrid, initGrid, onSizeChange]);

  // ─── Coordinate unprojection: screen → grid cell ──────────────────────────
  // Applies the inverse of the canvas transform (pan + zoom) to get grid coords.
  const getCellFromMouse = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const cssX = e.clientX - rect.left;
      const cssY = e.clientY - rect.top;

      const zoom = zoomRef.current;
      const pan = panRef.current;

      // Unproject: subtract pan offset, divide by zoom, then convert to cell coords
      const logicalX = (cssX - pan.x) / zoom;
      const logicalY = (cssY - pan.y) / zoom;

      const grid = mapGrid ?? { width: 0, height: 0 };
      const logicalW = grid.width * cellSize;
      const logicalH = grid.height * cellSize;
      const scaleX = width / (logicalW || 1);
      const scaleY = height / (logicalH || 1);
      const effectiveCellSizeX = cellSize * scaleX;
      const effectiveCellSizeY = cellSize * scaleY;

      const x = Math.floor(logicalX / effectiveCellSizeX);
      const y = Math.floor(logicalY / effectiveCellSizeY);

      if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
        return null;
      }

      return { x, y };
    },
    [cellSize, mapGrid, width, height]
  );

  // ─── Render loop ──────────────────────────────────────────────────────────
  // Redraws the entire canvas whenever data, size, pan, or zoom changes.
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sync canvas pixel dimensions from container props (with DPR scaling)
    const dpr = window.devicePixelRatio || 1;
    const physicalW = Math.round(width * dpr);
    const physicalH = Math.round(height * dpr);
    if (canvas.width !== physicalW || canvas.height !== physicalH) {
      canvas.width = physicalW;
      canvas.height = physicalH;
    }

    if (canvas.width === 0 || canvas.height === 0) return;

    // Apply DPR scale so all subsequent drawing uses CSS-pixel coordinates
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const grid = mapGrid ?? { width: 0, height: 0, cells: {} };

    // Base scale: 方案B — 分别独立填满 X/Y，消除黑边
    // Use CSS dimensions (width/height), not physical canvas pixels
    const logicalW = grid.width * cellSize;
    const logicalH = grid.height * cellSize;
    const scaleX = width / (logicalW || 1);
    const scaleY = height / (logicalH || 1);
    const ecX = cellSize * scaleX; // 格子在 X 方向的像素宽度
    const ecY = cellSize * scaleY; // 格子在 Y 方向的像素高度

    // 填满模式：初始 pan 设为 (0, 0)，无需居中偏移
    if (!hasInitializedRef.current && grid.width > 0) {
      defaultCenterRef.current = { x: 0, y: 0 };
      panRef.current = { x: 0, y: 0 };
      hasInitializedRef.current = true;
    }
    // Always keep defaultCenterRef in sync with current canvas size
    defaultCenterRef.current = { x: 0, y: 0 };

    const zoom = zoomRef.current;
    const pan = panRef.current;

    // Clear (CSS-pixel coords, DPR transform already applied)
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#1a3a5c';
    ctx.fillRect(0, 0, width, height);

    // Apply pan + zoom transform
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Grid area background — distinct from canvas background so boundary is clear
    ctx.fillStyle = '#faf3e0';
    ctx.fillRect(0, 0, grid.width * ecX, grid.height * ecY);

    // Grid border
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 1.5 / zoom;
    ctx.strokeRect(0, 0, grid.width * ecX, grid.height * ecY);

    // Grid lines
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.15)';
    ctx.lineWidth = 0.5 / zoom; // keep constant visual thickness
    for (let x = 0; x <= grid.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * ecX, 0);
      ctx.lineTo(x * ecX, grid.height * ecY);
      ctx.stroke();
    }
    for (let y = 0; y <= grid.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * ecY);
      ctx.lineTo(grid.width * ecX, y * ecY);
      ctx.stroke();
    }

    // Draw cells by layer
    const layerOrder: LayerId[] = ['terrain', 'territory', 'city', 'event', 'pin'];
    layerOrder.forEach((layerId) => {
      const layer = mapLayers.find((l) => l.id === layerId);
      if (!layer?.visible) return;

      const opacity = layer.opacity ?? 1;
      ctx.globalAlpha = opacity;

      Object.values(grid.cells).forEach((cell: GridCell) => {
        if (cell.layerId !== layerId) return;
        ctx.fillStyle = cell.color;
        ctx.fillRect(
          cell.x * ecX,
          cell.y * ecY,
          ecX,
          ecY
        );
      });
    });

    ctx.globalAlpha = 1;

    // ── Faction territory borders ────────────────────────────────────────────
    // Draw border lines around same-colored territory regions
    const territoryLayerForBorder = mapLayers.find((l) => l.id === 'territory');
    if (territoryLayerForBorder?.visible) {
      // Pre-build a lookup map for fast neighbor checks
      const territoryCells: Record<string, string> = {}; // key: "x,y" → color
      Object.values(grid.cells).forEach((cell: GridCell) => {
        if (cell.layerId !== 'territory') return;
        territoryCells[`${cell.x},${cell.y}`] = cell.color;
      });

      // For each territory cell, check 4 edges and draw border if neighbor differs
      const lw = 2.5 / zoom; // visual-constant line width

      // Outer glow (white, wider)
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = lw + 2 / zoom;
      ctx.lineCap = 'round';
      ctx.beginPath();
      Object.entries(territoryCells).forEach(([key, color]) => {
        const [x, y] = key.split(',').map(Number);
        const px = x * ecX;
        const py = y * ecY;
        const szX = ecX;
        const szY = ecY;
        // Top edge
        if (territoryCells[`${x},${y - 1}`] !== color) {
          ctx.moveTo(px, py);
          ctx.lineTo(px + szX, py);
        }
        // Bottom edge
        if (territoryCells[`${x},${y + 1}`] !== color) {
          ctx.moveTo(px, py + szY);
          ctx.lineTo(px + szX, py + szY);
        }
        // Left edge
        if (territoryCells[`${x - 1},${y}`] !== color) {
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + szY);
        }
        // Right edge
        if (territoryCells[`${x + 1},${y}`] !== color) {
          ctx.moveTo(px + szX, py);
          ctx.lineTo(px + szX, py + szY);
        }
      });
      ctx.stroke();

      // Inner line (faction color, narrower)
      // Group by color to batch strokes
      const borderPathsByColor: Record<string, Array<[number, number, number, number]>> = {};
      Object.entries(territoryCells).forEach(([key, color]) => {
        const [x, y] = key.split(',').map(Number);
        const px = x * ecX;
        const py = y * ecY;
        const szX = ecX;
        const szY = ecY;
        if (!borderPathsByColor[color]) borderPathsByColor[color] = [];
        const segments = borderPathsByColor[color];
        // Top edge
        if (territoryCells[`${x},${y - 1}`] !== color) {
          segments.push([px, py, px + szX, py]);
        }
        // Bottom edge
        if (territoryCells[`${x},${y + 1}`] !== color) {
          segments.push([px, py + szY, px + szX, py + szY]);
        }
        // Left edge
        if (territoryCells[`${x - 1},${y}`] !== color) {
          segments.push([px, py, px, py + szY]);
        }
        // Right edge
        if (territoryCells[`${x + 1},${y}`] !== color) {
          segments.push([px + szX, py, px + szX, py + szY]);
        }
      });

      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      Object.entries(borderPathsByColor).forEach(([color, segments]) => {
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        segments.forEach(([x1, y1, x2, y2]) => {
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        });
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }

    // ── Event markers ─────────────────────────────────────────────────────
    if (events.length > 0 && ecX * zoom > 2) {
      const eventLayer = mapLayers.find((l) => l.id === 'event');
      if (eventLayer?.visible) {
        // Build city position map for events with cityId
        const cityMap: Record<string, City> = {};
        cities.forEach((c: City) => { cityMap[c.id] = c; });

        // Build faction territory centroid map for events without cityId
        const factionCentroids: Record<string, { x: number; y: number; count: number }> = {};
        Object.values(grid.cells).forEach((cell: GridCell) => {
          if (cell.layerId !== 'territory') return;
          const faction = factions.find((f) => f.color === cell.color);
          if (!faction) return;
          if (!factionCentroids[faction.id]) {
            factionCentroids[faction.id] = { x: 0, y: 0, count: 0 };
          }
          factionCentroids[faction.id].x += cell.x;
          factionCentroids[faction.id].y += cell.y;
          factionCentroids[faction.id].count += 1;
        });

        events.forEach((evt: HistoryEvent) => {
          // Determine event position: cityId > faction centroid
          let ex = -1, ey = -1;
          if (evt.cityId && cityMap[evt.cityId]) {
            const city = cityMap[evt.cityId];
            ex = city.gridX;
            ey = city.gridY;
          } else if (evt.factionIds.length > 0) {
            // Use first faction's centroid
            for (const fId of evt.factionIds) {
              const c = factionCentroids[fId];
              if (c && c.count > 0) {
                ex = Math.round(c.x / c.count);
                ey = Math.round(c.y / c.count);
                break;
              }
            }
          }
          if (ex < 0 || ey < 0) return; // No position to render

          const cx = (ex + 0.5) * ecX;
          const cy = (ey + 0.5) * ecY;
          const markerR = Math.max(2.5, Math.min(ecX, ecY) * 0.3);

          // Diamond shape for events
          ctx.globalAlpha = 0.85;
          const faction = factions.find((f) => evt.factionIds.includes(f.id));
          ctx.fillStyle = faction?.color ?? '#C0392B';
          ctx.beginPath();
          ctx.moveTo(cx, cy - markerR);
          ctx.lineTo(cx + markerR, cy);
          ctx.lineTo(cx, cy + markerR);
          ctx.lineTo(cx - markerR, cy);
          ctx.closePath();
          ctx.fill();

          // White border
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(0.5, 1 / zoom);
          ctx.stroke();

          // Event label (only when zoomed in enough)
          if (ecX * zoom > 5) {
            const fontSize = Math.max(7, Math.min(10, Math.min(ecX, ecY) * 1.2));
            ctx.font = `bold ${fontSize}px "Noto Sans SC", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            const text = `${evt.year} ${evt.title}`;
            const metrics = ctx.measureText(text);
            const textW = metrics.width;
            const padX = fontSize * 0.25;
            const padY = fontSize * 0.15;

            ctx.globalAlpha = 0.7;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.beginPath();
            drawRoundRect(
              ctx,
              cx - textW / 2 - padX,
              cy + markerR + 2,
              textW + padX * 2,
              fontSize + padY * 2,
              2
            );
            ctx.fill();

            ctx.globalAlpha = 0.95;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(text, cx, cy + markerR + 2 + padY);
          }
        });

        ctx.globalAlpha = 1;
      }
    }

    // ── Brush/eraser size preview cursor ──────────────────────────────────────
    const currentTool = readOnlyRef.current ? 'pan' : drawingToolRef.current;
    const currentBrushSize = brushSizeRef.current;
    if ((currentTool === 'brush' || currentTool === 'eraser') && hoveredCellRef.current) {
      const hc = hoveredCellRef.current;
      const halfSize = Math.floor(currentBrushSize / 2);
      const grid = mapGrid ?? { width: 0, height: 0 };
      for (let dx = -halfSize; dx <= halfSize; dx++) {
        for (let dy = -halfSize; dy <= halfSize; dy++) {
          const cx = hc.x + dx;
          const cy = hc.y + dy;
          if (cx < 0 || cy < 0 || cx >= grid.width || cy >= grid.height) continue;
          const px = cx * ecX;
          const py = cy * ecY;
          ctx.fillStyle = currentTool === 'eraser'
            ? 'rgba(255, 100, 100, 0.25)'
            : 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(px, py, ecX, ecY);
          // Border around each preview cell
          ctx.strokeStyle = currentTool === 'eraser'
            ? 'rgba(255, 80, 80, 0.5)'
            : 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 0.5 / zoom;
          ctx.strokeRect(px, py, ecX, ecY);
        }
      }
    }

    ctx.restore();

    // Notify parent of pan/zoom state for overlay sync
    if (onPanZoomChange) {
      onPanZoomChange(pan.x, pan.y, zoom, ecX, ecY);
    }
  }, [mapGrid, mapLayers, factions, cities, events, cellSize, width, height, onPanZoomChange]);

  // Re-render when data changes
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Cleanup hover rAF on unmount
  useEffect(() => {
    return () => {
      if (hoverRafRef.current) {
        cancelAnimationFrame(hoverRafRef.current);
      }
    };
  }, []);

  // ─── Space key listener for temporary pan mode ────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        spaceHeldRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceHeldRef.current = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // ─── Mouse event handlers ────────────────────────────────────────────────
  // 当 readOnly=true 时，将 drawingTool 视为 'pan'，禁止任何编辑操作
  const effectiveTool = readOnly ? 'pan' : drawingTool;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Middle button always starts panning
      // Left button: pan if tool is 'pan'/'pin' or space is held, otherwise draw
      const isPanGesture =
        e.button === 1 ||
        (e.button === 0 && (effectiveTool === 'pan' || effectiveTool === 'pin' || effectiveTool === 'city' || spaceHeldRef.current));

      if (isPanGesture) {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY };
        panStartOffsetRef.current = { ...panRef.current };
        // Record mouse down position for click detection (needed for pan/pin tool)
        mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
        return;
      }

      if (e.button !== 0) return;

      // Drawing mode
      const cell = getCellFromMouse(e);
      if (!cell) return;

      setIsDrawing(true);
      setLastCell(cell);

      if (effectiveTool === 'brush') {
        paintCell(cell.x, cell.y);
        audioManager.playSFX('sfx/paint_start');
      } else if (effectiveTool === 'eraser') {
        eraseCell(cell.x, cell.y);
      }
    },
    [getCellFromMouse, effectiveTool, paintCell, eraseCell]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isPanningRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        panRef.current = {
          x: panStartOffsetRef.current.x + dx,
          y: panStartOffsetRef.current.y + dy,
        };
        renderCanvas();
        // During drag, clear any hover
        if (onHoverFaction && lastHoveredFactionRef.current !== null) {
          lastHoveredFactionRef.current = null;
          onHoverFaction(null, e.clientX, e.clientY);
        }
        return;
      }

      if (!isDrawing) {
        // Not drawing, not panning → update brush preview cursor & check faction hover
        const cell = getCellFromMouse(e);
        const isBrushTool = effectiveTool === 'brush' || effectiveTool === 'eraser';

        if (isBrushTool) {
          const prev = hoveredCellRef.current;
          if (!cell && prev || cell && !prev || (cell && prev && (cell.x !== prev.x || cell.y !== prev.y))) {
            hoveredCellRef.current = cell;
            // Throttle redraws via rAF to avoid full-canvas repaint per mousemove
            if (!hoverRafRef.current) {
              hoverRafRef.current = requestAnimationFrame(() => {
                hoverRafRef.current = 0;
                renderCanvas();
              });
            }
          }
        } else {
          // Clear preview when switching to non-brush tool
          if (hoveredCellRef.current) {
            hoveredCellRef.current = null;
            renderCanvas();
          }
        }

        if (onHoverFaction) {
          if (cell) {
            const grid = mapGrid ?? { width: 0, height: 0, cells: {} };
            const cellKey = `territory:${cell.x},${cell.y}`;
            const gridCell = (grid.cells as Record<string, GridCell>)[cellKey];
            if (gridCell) {
              const faction = factions.find((f) => f.color === gridCell.color);
              const factionId = faction?.id ?? null;
              if (factionId !== lastHoveredFactionRef.current) {
                lastHoveredFactionRef.current = factionId;
                onHoverFaction(factionId, e.clientX, e.clientY);
              }
            } else {
              if (lastHoveredFactionRef.current !== null) {
                lastHoveredFactionRef.current = null;
                onHoverFaction(null, e.clientX, e.clientY);
              }
            }
          } else {
            if (lastHoveredFactionRef.current !== null) {
              lastHoveredFactionRef.current = null;
              onHoverFaction(null, e.clientX, e.clientY);
            }
          }
        }
        return;
      }

      const cell = getCellFromMouse(e);
      if (!cell) return;

      if (lastCell && lastCell.x === cell.x && lastCell.y === cell.y) {
        return;
      }

      setLastCell(cell);

      if (effectiveTool === 'brush') {
        paintCell(cell.x, cell.y);
        audioManager.playSFX('sfx/paint_stroke');
      } else if (effectiveTool === 'eraser') {
        eraseCell(cell.x, cell.y);
      }
    },
    [isDrawing, getCellFromMouse, lastCell, effectiveTool, paintCell, eraseCell, renderCanvas, onHoverFaction, mapGrid, factions]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        // Detect if this was a click (not a drag) → fire onCanvasClick
        // Works when using pan or pin tool
        const shouldFireClick = effectiveTool === 'pan' || effectiveTool === 'pin' || effectiveTool === 'city';
        if (shouldFireClick && mouseDownPosRef.current && onCanvasClick) {
          const dx = e.clientX - mouseDownPosRef.current.x;
          const dy = e.clientY - mouseDownPosRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 5) {
            // It's a click, not a drag
            onCanvasClick(e.clientX, e.clientY);
          }
        }
        mouseDownPosRef.current = null;
        return;
      }
      setIsDrawing(false);
      setLastCell(null);
    },
    [effectiveTool, onCanvasClick]
  );

  const handleMouseLeave = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
    }
    mouseDownPosRef.current = null;
    setIsDrawing(false);
    setLastCell(null);
    // Clear brush preview
    if (hoveredCellRef.current) {
      hoveredCellRef.current = null;
      renderCanvas();
    }
    // Clear hover when mouse leaves canvas
    if (onHoverFaction && lastHoveredFactionRef.current !== null) {
      lastHoveredFactionRef.current = null;
      onHoverFaction(null, 0, 0);
    }
  }, [onHoverFaction, renderCanvas]);

  // ─── Wheel zoom ──────────────────────────────────────────────────────────
  // Zooms centered on the mouse position.
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const oldZoom = zoomRef.current;
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * (1 + delta)));

      // Adjust pan so the point under the cursor stays fixed
      const pan = panRef.current;
      panRef.current = {
        x: mouseX - (mouseX - pan.x) * (newZoom / oldZoom),
        y: mouseY - (mouseY - pan.y) * (newZoom / oldZoom),
      };
      zoomRef.current = newZoom;

      renderCanvas();
    },
    [renderCanvas]
  );

  // Determine cursor based on effective tool
  const getCursor = () => {
    if (effectiveTool === 'pan') return 'grab';
    if (effectiveTool === 'pin' || effectiveTool === 'city') return 'copy';
    if (effectiveTool === 'eraser') return 'cell';
    return 'crosshair';
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        cursor: getCursor(),
        ...(effectiveTool === 'pan' ? { '&:active': { cursor: 'grabbing' } } : {}),
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        style={{
          display: 'block',
          width: `${width}px`,
          height: `${height}px`,
        }}
      />
    </Box>
  );
});

GridCanvas.displayName = 'GridCanvas';

export default GridCanvas;
