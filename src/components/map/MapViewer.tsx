/**
 * MapViewer - 地图查看/编辑器（仪表盘专用）
 *
 * 单一模式：默认移动工具（浏览），可切换到刷子/橡皮擦/图钉等工具
 * 顶栏常驻：工具栏 + 颜色选择器
 * 左侧图层面板：常驻显示
 * 右下角：缩放控制 + 世界信息
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Dialog,
  Typography,
  Tooltip,
  Chip,
  IconButton,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useWorldStore } from '../../store/worldStore';
import MapPinComponent from './MapPin';
import MapCityMarker from './MapCityMarker';
import GridCanvas from './GridCanvas';
import MarkerDetailDialog, { type MarkerInfo } from './MarkerDetailDialog';
import PinForm from './PinForm';
import PinDrawer from './PinDrawer';
import CityForm from '../city/CityForm';
import LayerPanel from './LayerPanel';
import DrawingToolbar from './DrawingToolbar';
import ColorPicker from './ColorPicker';
import type { MapPin as MapPinType, City } from '../../types';

// ─── 主组件 ──────────────────────────────────────────────────────────────────

const MapViewer: React.FC = () => {
  // ── Store data ──
  const mapPins = useWorldStore((s) => s.data.mapPins);
  const mapLayers = useWorldStore((s) => s.data.mapLayers ?? []);
  const factions = useWorldStore((s) => s.data.factions);
  const cities = useWorldStore((s) => s.data.cities);
  const events = useWorldStore((s) => s.data.events);
  const worldName = useWorldStore((s) => s.data.meta.name);

  const addMapPin = useWorldStore((s) => s.addMapPin);
  const addCity = useWorldStore((s) => s.addCity);
  const updateCity = useWorldStore((s) => s.updateCity);
  const drawingTool = useWorldStore((s) => s.drawingTool);

  // ── UI state ──

  // ── Marker detail state ──
  const [activeMarker, setActiveMarker] = useState<MarkerInfo | null>(null);

  // ── Pin management state ──
  const [selectedPin, setSelectedPin] = useState<MapPinType | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formPos, setFormPos] = useState({ x: 50, y: 50 });

  // ── City form state ──
  const [cityFormOpen, setCityFormOpen] = useState(false);
  const [cityFormMode, setCityFormMode] = useState<'create' | 'edit'>('create');
  const [cityFormInitialData, setCityFormInitialData] = useState<City | undefined>(undefined);
  const [cityFormGridPos, setCityFormGridPos] = useState<{ gridX: number; gridY: number } | null>(null);

  // ── Faction hover state ──
  const [hoverFaction, setHoverFaction] = useState<{ id: string; name: string; color: string; x: number; y: number } | null>(null);

  // ── Canvas state ──
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [panZoom, setPanZoom] = useState({ panX: 0, panY: 0, zoom: 1, effectiveCellSize: 10, effectiveCellSizeY: 10 });
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const gridCanvasRef = useRef<React.ComponentRef<typeof GridCanvas>>(null);

  // ── Canvas size tracking ──
  // Subtract toolbar height (52px) and layer panel width (200px) so the canvas
  // renders centered within the *visible* area, not the full container.
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const TOOLBAR_H = 52;
    const LAYER_W = 200;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasSize({
          width: Math.max(0, Math.floor(width - LAYER_W)),
          height: Math.max(0, Math.floor(height - TOOLBAR_H)),
        });
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ── Layer visibility ──
  const pinLayer = mapLayers.find((l) => l.id === 'pin');
  const showPins = pinLayer?.visible ?? true;
  const cityLayer = mapLayers.find((l) => l.id === 'city');
  const showCities = cityLayer?.visible ?? true;

  // ── Stats ──
  const stats = [
    { label: '人物', value: useWorldStore((s) => s.data.characters.length) },
    { label: '势力', value: factions.length },
    { label: '事件', value: events.length },
    { label: '城市', value: cities.length },
  ];

  // ── Pin click handler ──
  const handlePinClick = useCallback((pin: MapPinType) => {
    if (drawingTool === 'pin') {
      setSelectedPin(pin);
      setDrawerOpen(true);
    } else {
      setActiveMarker({ type: 'pin', id: pin.id });
    }
  }, [drawingTool]);

  // ── Canvas click → pin/city placement or hit test ──
  const handleCanvasClick = useCallback(
    (clientX: number, clientY: number) => {
      // Pin tool: open PinForm at click position
      if (drawingTool === 'pin') {
        const container = canvasContainerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const x = ((clientX - rect.left) / rect.width) * 100;
          const y = ((clientY - rect.top) / rect.height) * 100;
          setFormPos({ x, y });
          setShowForm(true);
        }
        return;
      }

      // City tool: open CityForm at grid position
      if (drawingTool === 'city') {
        const cell = gridCanvasRef.current?.hitTest(clientX, clientY);
        if (cell) {
          setCityFormGridPos({ gridX: cell.x, gridY: cell.y });
          setCityFormMode('create');
          setCityFormInitialData(undefined);
          setCityFormOpen(true);
        }
        return;
      }

      // Pan tool: hit test for marker details
      if (drawingTool !== 'pan') return;

      const cell = gridCanvasRef.current?.hitTest(clientX, clientY);
      if (!cell) return;

      const gridX = cell.x;
      const gridY = cell.y;

      // Check city hit (within 2-cell radius)
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
      const grid = mapGrid ?? { cells: {} as Record<string, import('../../types').GridCell> };
      const gridCell = (grid.cells as Record<string, import('../../types').GridCell>)[cellKey];
      if (gridCell) {
        const faction = factions.find((f) => f.color === gridCell.color);
        if (faction) {
          setActiveMarker({ type: 'faction', id: faction.id });
          return;
        }
      }
    },
    [drawingTool, cities, factions, events]
  );

  // ── Pin management ──
  const handleSavePin = (data: Omit<MapPinType, 'id'>) => {
    addMapPin(data);
    setShowForm(false);
  };

  // ── City management ──
  const handleCityClick = useCallback((city: City) => {
    if (drawingTool === 'pan') {
      setActiveMarker({ type: 'city', id: city.id });
    }
  }, [drawingTool]);

  const handleCityDragEnd = useCallback((cityId: string, gridX: number, gridY: number) => {
    updateCity(cityId, { gridX, gridY });
  }, [updateCity]);

  const handleCityFormSave = useCallback((data: Omit<City, 'id'> | City) => {
    if (cityFormMode === 'create') {
      addCity(data as Omit<City, 'id'>);
    } else {
      const cityData = data as City;
      updateCity(cityData.id, cityData);
    }
    setCityFormOpen(false);
    setCityFormGridPos(null);
    setCityFormInitialData(undefined);
  }, [cityFormMode, addCity, updateCity]);

  const handlePanZoomChange = useCallback(
    (panX: number, panY: number, zoom: number, effectiveCellSize: number, effectiveCellSizeY?: number) => {
      setPanZoom({ panX, panY, zoom, effectiveCellSize, effectiveCellSizeY: effectiveCellSizeY ?? effectiveCellSize });
    },
    []
  );

  // ── Faction hover ──
  const handleHoverFaction = useCallback(
    (factionId: string | null, screenX: number, screenY: number) => {
      if (!factionId) {
        setHoverFaction(null);
        return;
      }
      const faction = factions.find((f) => f.id === factionId);
      if (faction) {
        setHoverFaction({ id: faction.id, name: faction.name, color: faction.color, x: screenX, y: screenY });
      }
    },
    [factions]
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
      }}
    >
      {/* ===== TOP TOOLBAR ===== */}
      <Box
        data-edit-toolbar="true"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 0.75,
          bgcolor: 'rgba(250, 248, 242, 0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(26,35,126,0.12)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
      >
        <DrawingToolbar />

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <ColorPicker />

        <Box sx={{ flex: 1 }} />

        {/* World name + stats in toolbar */}
        <Chip
          size="small"
          label={worldName}
          sx={{
            bgcolor: 'rgba(26,35,126,0.08)',
            color: '#1a237e',
            fontWeight: 600,
            height: 24,
            fontSize: '0.75rem',
            '& .MuiChip-label': { px: 1 },
          }}
        />
        {stats.map((s) => (
          <Chip
            key={s.label}
            size="small"
            label={`${s.value} ${s.label}`}
            sx={{
              bgcolor: 'rgba(0,0,0,0.04)',
              color: 'text.secondary',
              height: 24,
              fontSize: '0.7rem',
              '& .MuiChip-label': { px: 1, fontSize: '0.7rem' },
            }}
          />
        ))}
      </Box>

      {/* ===== LAYER PANEL (always visible) ===== */}
      <Box
        data-layer-panel="true"
        sx={{
          position: 'absolute',
          top: 52,
          left: 0,
          bottom: 0,
          width: 200,
          zIndex: 15,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'rgba(250, 248, 242, 0.95)',
          backdropFilter: 'blur(8px)',
          borderRight: '1px solid rgba(26,35,126,0.1)',
          overflowY: 'auto',
        }}
      >
        <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid rgba(26,35,126,0.08)' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#1a237e', fontSize: '0.75rem' }}>
            图层
          </Typography>
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
          <LayerPanel />
        </Box>
      </Box>

      {/* ===== GRID CANVAS + CITY MARKERS ===== */}
      {/* Positioned below the toolbar and right of the layer panel for true visual centering */}
      {canvasSize.width > 0 && canvasSize.height > 0 && (
        <Box sx={{ position: 'absolute', top: 52, left: 200, right: 0, bottom: 0 }}>
          <GridCanvas
            ref={gridCanvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            onCanvasClick={handleCanvasClick}
            onPanZoomChange={handlePanZoomChange}
            onHoverFaction={handleHoverFaction}
          />

          {/* City markers overlay synced with Canvas transform */}
          {showCities && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 0,
                height: 0,
                overflow: 'visible',
                pointerEvents: 'none',
                transform: `translate(${panZoom.panX}px, ${panZoom.panY}px) scale(${panZoom.zoom})`,
                transformOrigin: '0 0',
                zIndex: 12,
              }}
            >
              {cities.map((city) => (
                <Box
                  key={city.id}
                  sx={{ pointerEvents: 'auto' }}
                >
                  <MapCityMarker
                    city={city}
                    effectiveCellSize={panZoom.effectiveCellSize}
                    effectiveCellSizeY={panZoom.effectiveCellSizeY}
                    onClick={handleCityClick}
                    onDragEnd={handleCityDragEnd}
                    hitTest={(cx, cy) => gridCanvasRef.current?.hitTest(cx, cy) ?? null}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* ===== PINS ===== */}
      {showPins &&
        mapPins.map((pin) => (
          <Box key={pin.id} data-pin="true">
            <MapPinComponent pin={pin} onClick={handlePinClick} selected={selectedPin?.id === pin.id} />
          </Box>
        ))}

      {/* ===== FACTION HOVER TOOLTIP ===== */}
      {hoverFaction && (
        <Box
          sx={{
            position: 'fixed',
            left: hoverFaction.x + 12,
            top: hoverFaction.y + 12,
            zIndex: 100,
            pointerEvents: 'none',
            px: 1.5,
            py: 0.5,
            borderRadius: 1.5,
            bgcolor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            maxWidth: 200,
          }}
        >
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: hoverFaction.color,
              border: '1px solid rgba(255,255,255,0.5)',
              flexShrink: 0,
            }}
          />
          <Typography
            sx={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#fff',
              whiteSpace: 'nowrap',
            }}
          >
            {hoverFaction.name}
          </Typography>
        </Box>
      )}

      {/* ===== BOTTOM-RIGHT: Zoom controls ===== */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 12,
          right: 12,
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
            onClick={() => gridCanvasRef.current?.zoomIn()}
            sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }, width: 32, height: 32 }}
          >
            <AddIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="缩小" placement="left">
          <IconButton
            size="small"
            onClick={() => gridCanvasRef.current?.zoomOut()}
            sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }, width: 32, height: 32 }}
          >
            <RemoveIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="还原默认" placement="left">
          <IconButton
            size="small"
            onClick={() => gridCanvasRef.current?.resetView()}
            sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }, width: 32, height: 32 }}
          >
            <RestartAltIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ===== BOTTOM-LEFT: Hint ===== */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          zIndex: 10,
          px: 1,
          py: 0.5,
          borderRadius: 1,
          bgcolor: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>
          滚轮缩放 · 拖拽平移 · 点击标记查看详情
        </Typography>
      </Box>

      {/* ===== Marker detail dialog ===== */}
      {activeMarker && (
        <MarkerDetailDialog marker={activeMarker} onClose={() => setActiveMarker(null)} />
      )}

      {/* ===== Pin creation dialog ===== */}
      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        maxWidth="xs"
        fullWidth
      >
        <PinForm
          defaultX={formPos.x}
          defaultY={formPos.y}
          onSave={handleSavePin}
          onCancel={() => setShowForm(false)}
        />
      </Dialog>

      {/* ===== City creation/edit dialog ===== */}
      <CityForm
        open={cityFormOpen}
        onClose={() => {
          setCityFormOpen(false);
          setCityFormGridPos(null);
          setCityFormInitialData(undefined);
        }}
        onSave={handleCityFormSave}
        mode={cityFormMode}
        initialData={cityFormInitialData}
        defaultGridPos={cityFormGridPos ?? undefined}
      />

      {/* ===== Pin detail drawer ===== */}
      <PinDrawer
        pin={selectedPin}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedPin(null);
        }}
      />

    </Box>
  );
};

export default MapViewer;
