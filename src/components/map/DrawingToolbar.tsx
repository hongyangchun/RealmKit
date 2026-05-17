/**
 * DrawingToolbar - 绘制工具栏
 * 紧凑横向工具按钮 + 撤销/重做
 */
import React from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import BrushIcon from '@mui/icons-material/Brush';
import AutoFixOffIcon from '@mui/icons-material/AutoFixOff';
import PanToolIcon from '@mui/icons-material/PanTool';
import PushPinIcon from '@mui/icons-material/PushPin';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import { useWorldStore } from '../../store/worldStore';
import type { DrawingTool } from '../../types';

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

const DrawingToolbar: React.FC = () => {
  const drawingTool = useWorldStore((s) => s.drawingTool);
  const setDrawingTool = useWorldStore((s) => s.setDrawingTool);
  const activeLayerId = useWorldStore((s) => s.activeLayerId);
  const mapLayers = useWorldStore((s) => s.data.mapLayers ?? []);
  const undoStack = useWorldStore((s) => s.undoStack);
  const redoStack = useWorldStore((s) => s.redoStack);
  const undo = useWorldStore((s) => s.undo);
  const redo = useWorldStore((s) => s.redo);
  const activeLayer = mapLayers.find((l) => l.id === activeLayerId);
  const isReadOnly = activeLayer?.isReadOnly ?? false;

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
