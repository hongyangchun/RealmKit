/**
 * DrawingToolbar - 绘制工具栏
 * 紧凑横向工具按钮 + 笔刷尺寸选择 + 撤销/重做
 */
import React from 'react';
import {
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import BrushIcon from '@mui/icons-material/Brush';
import AutoFixOffIcon from '@mui/icons-material/AutoFixOff';
import PanToolIcon from '@mui/icons-material/PanTool';
import PushPinIcon from '@mui/icons-material/PushPin';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import { useWorldStore } from '../../store/worldStore';
import type { DrawingTool, BrushSize } from '../../types';

/** 笔刷尺寸选项配置 */
const BRUSH_SIZES: { value: BrushSize; label: string; dotSize: number }[] = [
  { value: 1, label: '细 (1×1)', dotSize: 4 },
  { value: 3, label: '中 (3×3)', dotSize: 7 },
  { value: 5, label: '粗 (5×5)', dotSize: 11 },
];

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({
  icon,
  label,
  isActive = false,
  disabled = false,
  onClick,
}) => (
  <Tooltip title={label} placement="right">
    <span>
      <IconButton
        onClick={onClick}
        disabled={disabled}
        sx={{
          width: 32,
          height: 32,
          borderRadius: 1,
          bgcolor: isActive ? 'primary.main' : 'transparent',
          color: isActive ? 'white' : 'text.primary',
          transition: 'all 0.15s',
          '&:hover': {
            bgcolor: isActive ? 'primary.dark' : 'rgba(0,0,0,0.06)',
          },
          '&.Mui-disabled': { color: 'text.disabled' },
        }}
      >
        {icon}
      </IconButton>
    </span>
  </Tooltip>
);

/** 笔刷尺寸按钮 */
const SizeButton: React.FC<{
  dotSize: number;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ dotSize, label, isActive, onClick }) => (
  <Tooltip title={label} placement="bottom">
    <IconButton
      onClick={onClick}
      sx={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        minWidth: 0,
        padding: 0,
        border: isActive ? '1.5px solid' : '1px solid',
        borderColor: isActive ? 'primary.main' : 'rgba(0,0,0,0.2)',
        bgcolor: isActive ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s',
        '&:hover': {
          bgcolor: isActive ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0,0,0,0.04)',
        },
      }}
    >
      <Box
        sx={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          bgcolor: isActive ? 'primary.main' : 'rgba(0,0,0,0.5)',
        }}
      />
    </IconButton>
  </Tooltip>
);

const DrawingToolbar: React.FC = () => {
  const drawingTool = useWorldStore((s) => s.drawingTool);
  const setDrawingTool = useWorldStore((s) => s.setDrawingTool);
  const brushSize = useWorldStore((s) => s.brushSize);
  const setBrushSize = useWorldStore((s) => s.setBrushSize);
  const activeLayerId = useWorldStore((s) => s.activeLayerId);
  const mapLayers = useWorldStore((s) => s.data.mapLayers ?? []);
  const undoStack = useWorldStore((s) => s.undoStack);
  const redoStack = useWorldStore((s) => s.redoStack);
  const undo = useWorldStore((s) => s.undo);
  const redo = useWorldStore((s) => s.redo);
  const activeLayer = mapLayers.find((l) => l.id === activeLayerId);
  const isReadOnly = activeLayer?.isReadOnly ?? false;

  // 是否显示尺寸选择器（仅刷子和橡皮擦）
  const showSizeSelector = drawingTool === 'brush' || drawingTool === 'eraser';

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (redoStack.length > 0) redo();
        } else {
          if (undoStack.length > 0) undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack, undo, redo]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
      <ToolButton
        icon={<PanToolIcon sx={{ fontSize: 18 }} />}
        label="移动 (空格+拖拽)"
        isActive={drawingTool === 'pan'}
        onClick={() => setDrawingTool('pan')}
      />
      <ToolButton
        icon={<PushPinIcon sx={{ fontSize: 18 }} />}
        label="图钉 (点击地图放置)"
        isActive={drawingTool === 'pin'}
        onClick={() => setDrawingTool('pin')}
      />
      <ToolButton
        icon={<LocationCityIcon sx={{ fontSize: 18 }} />}
        label="城市 (点击地图放置)"
        isActive={drawingTool === 'city'}
        onClick={() => setDrawingTool('city')}
      />
      <ToolButton
        icon={<BrushIcon sx={{ fontSize: 18 }} />}
        label={`刷子 ${isReadOnly ? '(不可用)' : ''}`}
        isActive={drawingTool === 'brush'}
        disabled={isReadOnly}
        onClick={() => setDrawingTool('brush')}
      />
      <ToolButton
        icon={<AutoFixOffIcon sx={{ fontSize: 18 }} />}
        label={`橡皮擦 ${isReadOnly ? '(不可用)' : ''}`}
        isActive={drawingTool === 'eraser'}
        disabled={isReadOnly}
        onClick={() => setDrawingTool('eraser')}
      />

      {/* 笔刷尺寸选择器：仅在刷子或橡皮擦选中时显示 */}
      {showSizeSelector && (
        <>
          <Box sx={{ width: 1, height: 16, bgcolor: 'rgba(0,0,0,0.08)', mx: 0.25, borderRadius: 0.5 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mx: 0.25 }}>
            {BRUSH_SIZES.map((opt) => (
              <SizeButton
                key={opt.value}
                dotSize={opt.dotSize}
                label={opt.label}
                isActive={brushSize === opt.value}
                onClick={() => setBrushSize(opt.value)}
              />
            ))}
          </Box>
        </>
      )}

      <Box sx={{ width: 1, height: 20, bgcolor: 'rgba(0,0,0,0.08)', mx: 0.5, borderRadius: 0.5 }} />

      <ToolButton
        icon={<UndoIcon sx={{ fontSize: 18 }} />}
        label={`撤销 (${undoStack.length}) Ctrl+Z`}
        disabled={undoStack.length === 0}
        onClick={undo}
      />
      <ToolButton
        icon={<RedoIcon sx={{ fontSize: 18 }} />}
        label={`重做 (${redoStack.length}) Ctrl+Shift+Z`}
        disabled={redoStack.length === 0}
        onClick={redo}
      />
    </Box>
  );
};

export default DrawingToolbar;
