/**
 * MiniMapPreview - 迷你地图预览（增强版）
 * 只读缩略版地图，用于总览仪表盘。
 * 增强特性：
 * - 海洋渐变背景 + 海岸线描边
 * - 势力领地边界线
 * - 城市标记（带名称标签）
 * - 罗盘玫瑰装饰
 * - 鼠标 hover 显示势力名称浮层
 * - 点击跳转到完整世界地图
 */
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import MapIcon from '@mui/icons-material/Map';
import ExploreIcon from '@mui/icons-material/Explore';
import { useWorldStore } from '../../store/worldStore';
import type { Faction, City } from '../../types';

// ─── 颜色映射 ──────────────────────────────────────────────────────────────
const TERRAIN_COLORS: Record<string, string> = {
  deep_ocean: '#1a5276',
  ocean: '#2980b9',
  shallow_water: '#5dade2',
  beach: '#f9e79f',
  grassland: '#82e0aa',
  forest: '#27ae60',
  dense_forest: '#1e8449',
  hill: '#a9dfbf',
  mountain: '#7f8c8d',
  snow_peak: '#d5dbdb',
  desert: '#f0b27a',
  swamp: '#76d7c4',
  tundra: '#d5dbdb',
  volcanic: '#c0392b',
};

const WATER_TYPES = new Set(['deep_ocean', 'ocean', 'shallow_water']);

/** 画罗盘玫瑰 */
function drawCompass(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.save();
  ctx.globalAlpha = 0.25;

  // 外圈
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.strokeStyle = '#1a237e';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 四个方向箭头
  const dirs = [
    { angle: -Math.PI / 2, label: 'N' },
    { angle: 0, label: 'E' },
    { angle: Math.PI / 2, label: 'S' },
    { angle: Math.PI, label: 'W' },
  ];

  dirs.forEach(({ angle, label }) => {
    const tipX = cx + Math.cos(angle) * size * 0.85;
    const tipY = cy + Math.sin(angle) * size * 0.85;
    const baseL = cx + Math.cos(angle - 0.3) * size * 0.3;
    const baseR = cx + Math.cos(angle + 0.3) * size * 0.3;
    const baseLY = cy + Math.sin(angle - 0.3) * size * 0.3;
    const baseRY = cy + Math.sin(angle + 0.3) * size * 0.3;

    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(baseL, baseLY);
    ctx.lineTo(cx, cy);
    ctx.lineTo(baseR, baseRY);
    ctx.closePath();
    ctx.fillStyle = label === 'N' ? '#c0392b' : '#1a237e';
    ctx.fill();

    // 方向标签
    const labelX = cx + Math.cos(angle) * size * 1.15;
    const labelY = cy + Math.sin(angle) * size * 1.15;
    ctx.fillStyle = '#1a237e';
    ctx.font = `bold ${Math.max(7, size * 0.35)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, labelX, labelY);
  });

  ctx.restore();
}

/** 画比例尺 */
function drawScaleBar(ctx: CanvasRenderingContext2D, x: number, y: number, cellW: number) {
  ctx.save();
  ctx.globalAlpha = 0.3;

  const barCells = 10;
  const barW = barCells * cellW;
  ctx.fillStyle = '#1a237e';
  ctx.fillRect(x, y, barW, 3);

  // 端点标记
  ctx.fillRect(x, y - 2, 1, 7);
  ctx.fillRect(x + barW, y - 2, 1, 7);

  ctx.font = `${Math.max(7, cellW * 3)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1a237e';
  ctx.fillText(`${barCells} 格`, x + barW / 2, y + 12);

  ctx.restore();
}

// ─── 主组件 ────────────────────────────────────────────────────────────────

const MiniMapPreview: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // hover 状态
  const [hoverInfo, setHoverInfo] = useState<{
    name: string;
    color: string;
    x: number;
    y: number;
  } | null>(null);

  const mapGrid = useWorldStore((s) => s.data.mapGrid);
  const factions = useWorldStore((s) => s.data.factions);
  const cities = useWorldStore((s) => s.data.cities);

  const cells = mapGrid?.cells ?? {};
  const gridWidth = mapGrid?.width ?? 100;
  const gridHeight = mapGrid?.height ?? 100;
  const hasCells = Object.keys(cells).length > 0;

  const factionMap = React.useMemo(() => {
    const m: Record<string, Faction> = {};
    factions.forEach((f) => (m[f.id] = f));
    return m;
  }, [factions]);

  /** 在 Canvas 上渲染缩略图 */
  const renderMap = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w === 0 || h === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // ── 海洋渐变背景 ──
    const oceanGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    oceanGrad.addColorStop(0, '#2980b9');
    oceanGrad.addColorStop(1, '#1a5276');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, w, h);

    // 空状态
    if (!hasCells) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 0.5;
      const cellW = w / gridWidth;
      const cellH = h / gridHeight;
      for (let x = 0; x <= gridWidth; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x * cellW, 0);
        ctx.lineTo(x * cellW, h);
        ctx.stroke();
      }
      for (let y = 0; y <= gridHeight; y += 10) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellH);
        ctx.lineTo(w, y * cellH);
        ctx.stroke();
      }
      // 装饰性罗盘
      drawCompass(ctx, w - 35, h - 35, 18);
      return;
    }

    const cellW = w / gridWidth;
    const cellH = h / gridHeight;

    // ── 1. 渲染地形 ──
    Object.entries(cells).forEach(([key, cell]) => {
      const [x, y] = key.split(',').map(Number);
      const terrainColor = TERRAIN_COLORS[cell.terrain ?? ''] ?? '#82e0aa';
      ctx.fillStyle = terrainColor;
      ctx.fillRect(x * cellW, y * cellH, Math.ceil(cellW), Math.ceil(cellH));
    });

    // ── 2. 海岸线描边 ──
    ctx.save();
    ctx.strokeStyle = 'rgba(26, 82, 118, 0.35)';
    ctx.lineWidth = 1.5;
    Object.entries(cells).forEach(([key, cell]) => {
      if (!cell.terrain || WATER_TYPES.has(cell.terrain)) return;
      const [x, y] = key.split(',').map(Number);
      const px = x * cellW;
      const py = y * cellH;
      // 检查四个方向是否为水域或越界 → 画海岸线
      const neighbors = [
        { dx: 0, dy: -1, x1: px, y1: py, x2: px + cellW, y2: py },
        { dx: 0, dy: 1, x1: px, y1: py + cellH, x2: px + cellW, y2: py + cellH },
        { dx: -1, dy: 0, x1: px, y1: py, x2: px, y2: py + cellH },
        { dx: 1, dy: 0, x1: px + cellW, y1: py, x2: px + cellW, y2: py + cellH },
      ];
      neighbors.forEach(({ dx, dy, x1, y1, x2, y2 }) => {
        const nk = `${x + dx},${y + dy}`;
        const neighbor = cells[nk];
        if (!neighbor || !neighbor.terrain || WATER_TYPES.has(neighbor.terrain)) {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      });
    });
    ctx.restore();

    // ── 3. 势力领地覆盖 + 边界线 ──
    // 先画半透明覆盖
    Object.entries(cells).forEach(([key, cell]) => {
      if (!cell.factionId) return;
      const faction = factionMap[cell.factionId];
      if (!faction) return;
      const [x, y] = key.split(',').map(Number);
      ctx.fillStyle = faction.color + '44';
      ctx.fillRect(x * cellW, y * cellH, Math.ceil(cellW), Math.ceil(cellH));
    });

    // 势力边界线
    ctx.save();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    // 按势力分组收集边界段
    const factionBorders: Record<string, Array<{ x1: number; y1: number; x2: number; y2: number }>> = {};
    Object.entries(cells).forEach(([key, cell]) => {
      if (!cell.factionId) return;
      const [x, y] = key.split(',').map(Number);
      if (!factionBorders[cell.factionId]) factionBorders[cell.factionId] = [];

      const edges = [
        { dx: 0, dy: -1, x1: x * cellW, y1: y * cellH, x2: (x + 1) * cellW, y2: y * cellH },
        { dx: 0, dy: 1, x1: x * cellW, y1: (y + 1) * cellH, x2: (x + 1) * cellW, y2: (y + 1) * cellH },
        { dx: -1, dy: 0, x1: x * cellW, y1: y * cellH, x2: x * cellW, y2: (y + 1) * cellH },
        { dx: 1, dy: 0, x1: (x + 1) * cellW, y1: y * cellH, x2: (x + 1) * cellW, y2: (y + 1) * cellH },
      ];
      edges.forEach(({ dx, dy, x1, y1, x2, y2 }) => {
        const nk = `${x + dx},${y + dy}`;
        const neighbor = cells[nk];
        if (!neighbor || neighbor.factionId !== cell.factionId) {
          factionBorders[cell.factionId!].push({ x1, y1, x2, y2 });
        }
      });
    });

    // 绘制各势力边界
    Object.entries(factionBorders).forEach(([fId, borders]) => {
      if (borders.length === 0) return;
      const faction = factionMap[fId];
      if (!faction) return;

      // 白色外发光
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      borders.forEach(({ x1, y1, x2, y2 }) => {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      });
      ctx.stroke();

      // 势力色线
      ctx.strokeStyle = faction.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      borders.forEach(({ x1, y1, x2, y2 }) => {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      });
      ctx.stroke();
    });
    ctx.restore();

    // ── 4. 城市标记（美化版）──
    cities.forEach((city) => {
      const cx = city.gridX * cellW + cellW / 2;
      const cy = city.gridY * cellH + cellH / 2;
      const faction = factionMap[city.factionId];
      const color = faction?.color ?? '#8B4513';
      const r = city.isCapital ? Math.max(4, cellW * 1.0) : Math.max(3, cellW * 0.7);

      // 外发光
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 白色边框
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // 首都金环
      if (city.isCapital) {
        ctx.strokeStyle = '#ffd54f';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 中心符号
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(7, r * 1.1)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(city.isCapital ? '★' : '●', cx, cy);

      // 城市名称标签（仅首都和尺寸足够时）
      if (city.isCapital || cellW > 3.5) {
        const fontSize = Math.max(8, Math.min(11, cellW * 1.8));
        ctx.font = `600 ${fontSize}px sans-serif`;
        const textW = ctx.measureText(city.name).width;

        // 标签背景
        const pad = 3;
        const labelX = cx - textW / 2 - pad;
        const labelY = cy + r + 3;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        roundRect(ctx, labelX, labelY, textW + pad * 2, fontSize + 4, 3);
        ctx.fill();

        // 标签文字
        ctx.fillStyle = '#1a237e';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(city.name, cx, labelY + 1);
      }
    });

    // ── 5. 装饰：罗盘 + 比例尺 ──
    const compassSize = Math.min(20, w * 0.06, h * 0.08);
    drawCompass(ctx, w - compassSize - 12, h - compassSize - 12, compassSize);
    drawScaleBar(ctx, 12, h - 14, cellW);

    // ── 6. 暗角效果 ──
    const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.75);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }, [cells, gridWidth, gridHeight, hasCells, factionMap, cities]);

  useEffect(() => {
    renderMap();
    const resizeObs = new ResizeObserver(() => renderMap());
    if (containerRef.current) resizeObs.observe(containerRef.current);
    return () => resizeObs.disconnect();
  }, [renderMap]);

  /** 鼠标移动 → 检测势力领地 */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!hasCells) {
        setHoverInfo(null);
        return;
      }
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cellW = rect.width / gridWidth;
      const cellH = rect.height / gridHeight;
      const gx = Math.floor(x / cellW);
      const gy = Math.floor(y / cellH);
      const key = `${gx},${gy}`;
      const cell = cells[key];
      if (cell?.factionId) {
        const faction = factionMap[cell.factionId];
        if (faction) {
          setHoverInfo({ name: faction.name, color: faction.color, x: e.clientX - rect.left, y: e.clientY - rect.top });
          return;
        }
      }
      setHoverInfo(null);
    },
    [hasCells, cells, gridWidth, gridHeight, factionMap],
  );

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 200,
        borderRadius: 2,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.15)',
        '&:hover .mini-map-overlay': { opacity: 1 },
        '&:hover .mini-map-hint': { opacity: 1 },
      }}
      onClick={() => navigate('/map')}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverInfo(null)}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />

      {/* 空状态提示 */}
      {!hasCells && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <ExploreIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,0.3)' }} />
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            地图尚未绘制
          </Typography>
        </Box>
      )}

      {/* 势力名称浮层 */}
      {hoverInfo && (
        <Box
          sx={{
            position: 'absolute',
            left: Math.min(hoverInfo.x + 12, (containerRef.current?.clientWidth ?? 300) - 100),
            top: hoverInfo.y - 28,
            pointerEvents: 'none',
            zIndex: 10,
            px: 1.5,
            py: 0.5,
            borderRadius: 1.5,
            background: 'rgba(26,35,126,0.9)',
            backdropFilter: 'blur(4px)',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: hoverInfo.color,
              border: '1px solid rgba(255,255,255,0.5)',
            }}
          />
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#fff',
              lineHeight: 1.2,
            }}
          >
            {hoverInfo.name}
          </Typography>
        </Box>
      )}

      {/* 悬浮跳转按钮 */}
      <Box
        className="mini-map-overlay"
        sx={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          opacity: 0,
          transition: 'opacity 0.25s',
          zIndex: 5,
        }}
      >
        <Button
          size="small"
          variant="contained"
          startIcon={<MapIcon />}
          sx={{
            backgroundColor: 'rgba(26,35,126,0.85)',
            backdropFilter: 'blur(4px)',
            '&:hover': { backgroundColor: 'rgba(26,35,126,0.95)' },
            fontSize: '0.75rem',
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          查看完整地图
        </Button>
      </Box>

      {/* 底部半透明提示条 */}
      <Box
        className="mini-map-hint"
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          py: 0.5,
          px: 1.5,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.25))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          opacity: 0.6,
          transition: 'opacity 0.25s',
          zIndex: 4,
        }}
      >
        <Typography
          sx={{
            fontSize: '0.65rem',
            color: 'rgba(255,255,255,0.7)',
            fontWeight: 500,
          }}
        >
          {factions.length} 个势力 · {cities.length} 座城市
        </Typography>
      </Box>
    </Box>
  );
};

/** 绘制圆角矩形辅助函数 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export default MiniMapPreview;
