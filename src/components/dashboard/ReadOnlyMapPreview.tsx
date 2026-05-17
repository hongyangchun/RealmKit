/**
 * ReadOnlyMapPreview - 只读地图预览
 *
 * 复用 GridCanvas 渲染引擎，展示与「世界地图」完全一致的地图效果。
 * 隐藏编辑工具栏/图层面板/图钉管理等，只保留：
 * - 地形 + 势力边界 + 城市标记 + 事件标记 + 图钉
 * - 拖拽平移 + 滚轮缩放
 * - hover 势力名称
 * - 点击标记弹窗详情
 * - 右下角缩放按钮
 * - 点击空白区域跳转到完整世界地图
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Tooltip,
  IconButton,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import GridCanvas from '../map/GridCanvas';
import MapCityMarker from '../map/MapCityMarker';
import MapPinComponent from '../map/MapPin';
import MarkerDetailDialog, { type MarkerInfo } from '../map/MarkerDetailDialog';
import { useWorldStore } from '../../store/worldStore';
import type { MapPin as MapPinType, City } from '../../types';

// ─── 主组件 ────────────────────────────────────────────────────────────────

const ReadOnlyMapPreview: React.FC = () => {
  const navigate = useNavigate();

  // Store
  const mapPins = useWorldStore((s) => s.data.mapPins);
  const mapLayers = useWorldStore((s) => s.data.mapLayers ?? []);
  const factions = useWorldStore((s) => s.data.factions);
  const cities = useWorldStore((s) => s.data.cities);
  const events = useWorldStore((s) => s.data.events);

  // Marker detail state
  const [activeMarker, setActiveMarker] = useState<MarkerInfo | null>(null);

  // Pin state (read-only: only click to view)
  const [selectedPin, setSelectedPin] = useState<MapPinType | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Faction hover state
  const [hoverFaction, setHoverFaction] = useState<{
    id: string; name: string; color: string; x: number; y: number;
  } | null>(null);

  // Canvas state
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [panZoom, setPanZoom] = useState({ panX: 0, panY: 0, zoom: 1, effectiveCellSize: 10 });
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const gridCanvasRef = useRef<React.ComponentRef<typeof GridCanvas>>(null);

  // Layer visibility
  const pinLayer = mapLayers.find((l) => l.id === 'pin');
  const showPins = pinLayer?.visible ?? true;
  const cityLayer = mapLayers.find((l) => l.id === 'city');
  const showCities = cityLayer?.visible ?? true;

  // Canvas size tracking
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ── Click handler ──
  const handleCanvasClick = useCallback(
    (clientX: number, clientY: number) => {
      const cell = gridCanvasRef.current?.hitTest(clientX, clientY);
      if (!cell) return;

      const gridX = cell.x;
      const gridY = cell.y;

      // Check city hit
      for (const city of cities) {
        const dx = city.gridX - gridX;
        const dy = city.gridY - gridY;
        if (Math.abs(dx) <= 2 && Math.abs(dy) <= 2) {
          setActiveMarker({ type: 'city', id: city.id });
          return;
        }
      }

      // Check event hit
      const cityMap: Record<string, { gridX: number; gridY: number }> = {};
      cities.forEach((c) => { cityMap[c.id] = { gridX: c.gridX, gridY: c.gridY }; });
      for (const evt of events) {
        let ex = -1, ey = -1;
        if (evt.cityId && cityMap[evt.cityId]) {
          ex = cityMap[evt.cityId].gridX;
          ey = cityMap[evt.cityId].gridY;
        }
        if (ex >= 0 && ey >= 0) {
          const dx = ex - gridX;
          const dy = ey - gridY;
          if (Math.abs(dx) <= 2 && Math.abs(dy) <= 2) {
            setActiveMarker({ type: 'event', id: evt.id });
            return;
          }
        }
      }

      // Check faction territory hit
      const mapGrid = useWorldStore.getState().data.mapGrid;
      const cellKey = `territory:${gridX},${gridY}`;
      const gridCell = (mapGrid?.cells ?? {})[cellKey];
      if (gridCell) {
        const faction = factions.find((f) => f.color === gridCell.color);
        if (faction) {
          setActiveMarker({ type: 'faction', id: faction.id });
          return;
        }
      }

      // Clicked empty space → navigate to full map
      navigate('/map');
    },
    [cities, factions, events, navigate],
  );

  // ── City handlers ──
  const handleCityClick = useCallback((city: City) => {
    setActiveMarker({ type: 'city', id: city.id });
  }, []);

  // ── Pin click ──
  const handlePinClick = useCallback((pin: MapPinType) => {
    setActiveMarker({ type: 'pin', id: pin.id });
  }, []);

  // ── PanZoom callback ──
  const handlePanZoomChange = useCallback(
    (panX: number, panY: number, zoom: number, effectiveCellSize: number) => {
      setPanZoom({ panX, panY, zoom, effectiveCellSize });
    },
    [],
  );

  // ── Faction hover ──
  const handleHoverFaction = useCallback(
    (factionId: string | null, screenX: number, screenY: number) => {
      if (!factionId) { setHoverFaction(null); return; }
      const faction = factions.find((f) => f.id === factionId);
      if (faction) {
        setHoverFaction({ id: faction.id, name: faction.name, color: faction.color, x: screenX, y: screenY });
      }
    },
    [factions],
  );

  return (
    <Box
      ref={canvasContainerRef}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#f5f2eb',
        borderRadius: 2,
      }}
    >
      {/* ===== GRID CANVAS ===== */}
      {canvasSize.width > 0 && canvasSize.height > 0 && (
        <GridCanvas
          ref={gridCanvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onCanvasClick={handleCanvasClick}
          onPanZoomChange={handlePanZoomChange}
          onHoverFaction={handleHoverFaction}
          readOnly
        />
      )}

      {/* ===== PINS ===== */}
      {showPins &&
        mapPins.map((pin) => (
          <Box key={pin.id} data-pin="true">
            <MapPinComponent pin={pin} onClick={handlePinClick} selected={selectedPin?.id === pin.id} />
          </Box>
        ))}

      {/* ===== CITY MARKERS ===== */}
      {showCities && (
        <Box
          sx={{
            position: 'absolute',
            top: 0, left: 0,
            width: 0, height: 0,
            overflow: 'visible',
            pointerEvents: 'none',
            transform: `translate(${panZoom.panX}px, ${panZoom.panY}px) scale(${panZoom.zoom})`,
            transformOrigin: '0 0',
            zIndex: 12,
          }}
        >
          {cities.map((city) => (
            <Box key={city.id} sx={{ pointerEvents: 'auto' }}>
              <MapCityMarker
                city={city}
                effectiveCellSize={panZoom.effectiveCellSize}
                onClick={handleCityClick}
                onDragEnd={() => {}}
                draggable={false}
                hitTest={(cx, cy) => gridCanvasRef.current?.hitTest(cx, cy) ?? null}
              />
            </Box>
          ))}
        </Box>
      )}

      {/* ===== FACTION HOVER TOOLTIP ===== */}
      {hoverFaction && (
        <Box
          sx={{
            position: 'fixed',
            left: hoverFaction.x + 12,
            top: hoverFaction.y + 12,
            zIndex: 100,
            pointerEvents: 'none',
            px: 1.5, py: 0.5,
            borderRadius: 1.5,
            bgcolor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
          }}
        >
          <Box
            sx={{
              width: 10, height: 10,
              borderRadius: '50%',
              background: hoverFaction.color,
              border: '1px solid rgba(255,255,255,0.5)',
              flexShrink: 0,
            }}
          />
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>
            {hoverFaction.name}
          </Typography>
        </Box>
      )}

      {/* ===== BOTTOM-RIGHT: Zoom controls + Full map button ===== */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          bgcolor: 'rgba(26,35,126,0.85)',
          backdropFilter: 'blur(4px)',
          borderRadius: 2,
          p: 0.5,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        <Tooltip title="放大" placement="left">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); gridCanvasRef.current?.zoomIn(); }}
            sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }, width: 28, height: 28 }}
          >
            <AddIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="缩小" placement="left">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); gridCanvasRef.current?.zoomOut(); }}
            sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }, width: 28, height: 28 }}
          >
            <RemoveIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="还原默认" placement="left">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); gridCanvasRef.current?.resetView(); }}
            sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }, width: 28, height: 28 }}
          >
            <RestartAltIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="打开完整地图" placement="left">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); navigate('/map'); }}
            sx={{ color: '#ffd54f', bgcolor: 'rgba(255,213,79,0.15)', '&:hover': { bgcolor: 'rgba(255,213,79,0.3)' }, width: 28, height: 28 }}
          >
            <FullscreenIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ===== BOTTOM-LEFT: Hint ===== */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          zIndex: 10,
          px: 1, py: 0.25,
          borderRadius: 1,
          bgcolor: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)' }}>
          滚轮缩放 · 拖拽平移 · 点击查看详情
        </Typography>
      </Box>

      {/* ===== Marker detail dialog ===== */}
      {activeMarker && (
        <MarkerDetailDialog marker={activeMarker} onClose={() => setActiveMarker(null)} />
      )}
    </Box>
  );
};

export default ReadOnlyMapPreview;
