/**
 * MapCanvas - 地图画布容器
 * 布局：顶栏（工具+图层）+ 全屏画布 + 右侧图钉抽屉
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Tooltip,
  IconButton,
  Snackbar,
  Alert,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import GridOnIcon from '@mui/icons-material/GridOn';
import GridOffIcon from '@mui/icons-material/GridOff';
import LayersIcon from '@mui/icons-material/Layers';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useWorldStore } from '../../store/worldStore';
import MapPinComponent from './MapPin';
import PinForm from './PinForm';
import PinDrawer from './PinDrawer';
import GridCanvas from './GridCanvas';
import LayerPanel from './LayerPanel';
import DrawingToolbar from './DrawingToolbar';
import ColorPicker from './ColorPicker';
import type { MapPin as MapPinType } from '../../types';

const MapCanvas: React.FC = () => {
  const mapPins = useWorldStore((s) => s.data.mapPins);
  const eras = useWorldStore((s) => s.data.eras);
  const factions = useWorldStore((s) => s.data.factions);
  const mapLayers = useWorldStore((s) => s.data.mapLayers ?? []);
  const addMapPin = useWorldStore((s) => s.addMapPin);
  const saveGridData = useWorldStore((s) => s.saveGridData);
  const clearMapData = useWorldStore((s) => s.clearMapData);

  const [selectedPin, setSelectedPin] = useState<MapPinType | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formPos, setFormPos] = useState({ x: 50, y: 50 });
  const [showGrid, setShowGrid] = useState(true);
  const [showLayerPanel, setShowLayerPanel] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [panZoom, setPanZoom] = useState({ panX: 0, panY: 0, zoom: 1, effectiveCellSize: 10, effectiveCellSizeY: 10 });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'info' });

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Handle canvas container resize
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Handle canvas click for adding pin
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-pin]')) return;
    if ((e.target as HTMLElement).closest('canvas')) return;
    if ((e.target as HTMLElement).closest('[data-layer-panel]')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setFormPos({ x, y });
    setShowForm(true);
  };

  const handleSavePin = (data: Omit<MapPinType, 'id'>) => {
    addMapPin(data as Omit<MapPinType, 'id'>);
    setShowForm(false);
  };

  const handlePinClick = (pin: MapPinType) => {
    setSelectedPin(pin);
    setDrawerOpen(true);
  };

  const handleSaveGrid = () => {
    saveGridData();
    setSnackbar({ open: true, message: '绘制数据已保存', severity: 'success' });
  };

  const handleDeleteMap = () => {
    if (window.confirm('确定要清空画布吗？此操作不可撤销。')) {
      clearMapData();
      setSnackbar({ open: true, message: '画布已清空', severity: 'info' });
    }
  };

  // GridCanvas ref for programmatic zoom/pan and hit testing
  const gridCanvasRef = useRef<React.ComponentRef<typeof GridCanvas>>(null);

  // Pan/zoom change handler for city marker overlay sync
  const handlePanZoomChange = useCallback(
    (panX: number, panY: number, zoom: number, effectiveCellSize: number, effectiveCellSizeY?: number) => {
      setPanZoom({ panX, panY, zoom, effectiveCellSize, effectiveCellSizeY: effectiveCellSizeY ?? effectiveCellSize });
    },
    []
  );

  // Faction hover handler
  const handleHoverFaction = useCallback(
    (factionId: string | null, _screenX: number, _screenY: number) => {
      // MapCanvas does not display faction hover tooltip; no-op placeholder
      void factionId;
    },
    []
  );

  // Canvas click handler for GridCanvas
  const handleGridCanvasClick = useCallback(
    (clientX: number, clientY: number) => {
      // In MapCanvas we only use click for pin placement via the container div,
      // but we still pass this callback so GridCanvas can report clicks properly.
      void clientX;
      void clientY;
    },
    []
  );

  // Check if pin layer is visible
  const pinLayer = mapLayers.find((l) => l.id === 'pin');
  const showPins = pinLayer?.visible ?? true;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* ===== Top toolbar ===== */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 0.75,
        borderBottom: '1px solid rgba(26,35,126,0.12)',
        zIndex: 10,
        position: 'relative',
        bgcolor: 'rgba(255, 253, 248, 0.97)',
        flexShrink: 0,
      }}>
        {/* Left: title + grid toggle */}
        <Typography variant="h6" sx={{ fontFamily: "'LXGW WenKai TC', serif", color: '#1a237e', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
          🗺️ 世界地图
        </Typography>

        <Tooltip title={showGrid ? '隐藏网格' : '显示网格'}>
          <IconButton size="small" onClick={() => setShowGrid(!showGrid)} sx={{ color: showGrid ? 'primary.main' : 'text.secondary' }}>
            {showGrid ? <GridOnIcon fontSize="small" /> : <GridOffIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Drawing tools (inline) */}
        <DrawingToolbar />

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Color picker (inline) */}
        <ColorPicker />

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Layer panel toggle */}
        <Tooltip title={showLayerPanel ? '隐藏图层面板' : '显示图层面板'}>
          <Button
            size="small"
            variant={showLayerPanel ? 'contained' : 'outlined'}
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            startIcon={<LayersIcon sx={{ fontSize: 16 }} />}
            sx={{ minWidth: 'auto', px: 1.5, py: 0.25, fontSize: '0.75rem' }}
          >
            图层
          </Button>
        </Tooltip>

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Right: save + clear */}
        <Button startIcon={<SaveIcon sx={{ fontSize: 16 }} />} size="small" color="primary" variant="contained" onClick={handleSaveGrid} sx={{ fontSize: '0.75rem' }}>
          保存
        </Button>
        <Button startIcon={<DeleteIcon sx={{ fontSize: 16 }} />} size="small" color="error" variant="outlined" onClick={handleDeleteMap} sx={{ fontSize: '0.75rem' }}>
          清空
        </Button>
      </Box>

      {/* ===== Main content area ===== */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Collapsible layer panel */}
        {showLayerPanel && (
          <Box
            data-layer-panel="true"
            sx={{
              width: 200,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'rgba(250, 248, 242, 0.95)',
              borderRight: '1px solid rgba(26,35,126,0.1)',
              overflowY: 'auto',
            }}
          >
            {/* Layer panel header */}
            <Box sx={{
              px: 1.5,
              py: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              flexShrink: 0,
            }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#1a237e', fontSize: '0.75rem' }}>
                📋 图层
              </Typography>
              <IconButton size="small" onClick={() => setShowLayerPanel(false)} sx={{ p: 0.25 }}>
                <ChevronLeftIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>

            {/* Layer list */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
              <LayerPanel />
            </Box>
          </Box>
        )}

        {/* Layer panel collapsed toggle */}
        {!showLayerPanel && (
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 5,
            }}
          >
            <Tooltip title="显示图层面板">
              <IconButton
                size="small"
                onClick={() => setShowLayerPanel(true)}
                sx={{
                  bgcolor: 'rgba(255,253,248,0.9)',
                  border: '1px solid rgba(26,35,126,0.15)',
                  borderRadius: '0 6px 6px 0',
                  width: 24,
                  height: 48,
                  '&:hover': { bgcolor: 'rgba(255,253,248,1)' },
                }}
              >
                <ChevronRightIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Canvas area */}
        <Box
          ref={canvasContainerRef}
          onClick={handleCanvasClick}
          sx={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            cursor: showGrid ? 'crosshair' : 'default',
            background: '#f5f2eb',
          }}
        >
          {/* Grid canvas layer */}
          {showGrid && canvasSize.width > 0 && canvasSize.height > 0 && (
            <GridCanvas
              ref={gridCanvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              onCanvasClick={handleGridCanvasClick}
              onPanZoomChange={handlePanZoomChange}
              onHoverFaction={handleHoverFaction}
            />
          )}

          {/* Render visible pins */}
          {showPins && mapPins.map((pin) => (
            <Box key={pin.id} data-pin="true">
              <MapPinComponent pin={pin} onClick={handlePinClick} selected={selectedPin?.id === pin.id} />
            </Box>
          ))}

          {/* Add pin FAB */}
          <Box sx={{ position: 'absolute', bottom: 16, right: 16, zIndex: 100 }}>
            <Tooltip title="添加图钉">
              <Button
                variant="contained"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  setFormPos({ x: 50, y: 50 });
                  setShowForm(true);
                }}
                sx={{
                  borderRadius: '50%',
                  minWidth: 48,
                  height: 48,
                  boxShadow: 3,
                  '&:hover': { boxShadow: 6 },
                }}
              >
                <AddIcon />
              </Button>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Pin creation overlay */}
      {showForm && (
        <Box
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ background: '#fff', borderRadius: 2, boxShadow: 24 }}>
            <PinForm
              defaultX={formPos.x}
              defaultY={formPos.y}
              onSave={handleSavePin}
              onCancel={() => setShowForm(false)}
            />
          </Box>
        </Box>
      )}

      {/* Pin detail drawer */}
      <PinDrawer
        pin={selectedPin}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedPin(null);
        }}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MapCanvas;
